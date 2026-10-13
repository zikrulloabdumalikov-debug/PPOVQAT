/**
 * Sog'lom Ovqatlar — Supabase runtime.
 *
 * Biznes mantiq (logic.ts) sinxron va xotirada ishlaydi. Runtime:
 *   1) Telegram initData imzosini tekshiradi (TZ 11.1);
 *   2) tranzaksiya ochadi, yozuvchi amalda pg_advisory_xact_lock oladi (TZ 11.2);
 *   3) kerakli jadvallarni o'qib mantiqqa beradi (mijoz faqat o'z qatorlarini oladi);
 *   4) mantiq qaytargan yozuvlar navbatini shu tranzaksiyada bajaradi — xato bo'lsa hammasi bekor;
 *   5) commit dan keyin Telegram xabarlarini yuboradi.
 *
 * Bu fayl Deno (Edge Functions) va Node (testlar) da bir xil ishlaydi: tashqi kutubxona import qilmaydi,
 * Postgres ulanishi (postgres.js), Storage va fetch tashqaridan beriladi.
 */
import * as L from './logic.ts';

/** Mantiqdagi xato turi (foydalanuvchiga ko'rsatiladi). */
const AppError = L.AppError as unknown as new (message: string, code?: string) => Error & { code: string };

// deno-lint-ignore no-explicit-any
export type Sql = any;

export interface Storage {
  upload(bucket: string, path: string, bytes: Uint8Array, contentType: string, upsert?: boolean): Promise<void>;
  download(bucket: string, path: string): Promise<{ bytes: Uint8Array; contentType: string }>;
  list(bucket: string, prefix: string): Promise<{ name: string }[]>;
  remove(bucket: string, paths: string[]): Promise<void>;
}

export interface RuntimeEnv {
  BOT_TOKEN: string;
  WEBAPP_URL?: string;
  ADMIN_TG_IDS?: string;
  WEBHOOK_SECRET?: string;
  CRON_SECRET?: string;
  ALLOW_TEST_SEED?: string;
}

export interface RuntimeOptions {
  sql: Sql;
  env: RuntimeEnv;
  storage: Storage;
  fetch?: typeof fetch;
  /** testlar uchun: qulf olinganda chaqiriladi */
  onLock?: () => void;
}

type Json = Record<string, unknown>;
type Op =
  | { op: 'insert'; table: string; rows: Json[] }
  | { op: 'update'; table: string; key: string; val: string; patch: Json }
  | { op: 'kesh'; kalit: string; qiymat: string; tugash: number }
  | { op: 'upload'; bucket: string; path: string; contentType: string; base64: string };

const LOCK_KEY = 72017201; // barcha yozuvchi amallar uchun bitta qulf (LockService bilan bir xil ma'no)
const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;
const INSERT_CHUNK = 1000;

const CLIENT_OWNED = ['Mijozlar', 'Manzillar', 'Buyurtmalar', 'Yetkazishlar', 'Tolovlar', 'KeshbekHarakat'];
const REFERENCE = ['Foydalanuvchilar', 'Ratsionlar', 'Narxlar', 'Paketlar', 'KeshbekQoida', 'Sozlama', 'Menyu'];

export function nowMs(): number {
  const g = globalThis as unknown as { __NOW__?: number };
  return g.__NOW__ || Date.now();
}

// ---------- Telegram initData (04_Auth.gs → Web Crypto) ----------

const enc = new TextEncoder();

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authError(msg: string): never {
  throw new AppError(msg, 'auth');
}

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of String(qs || '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = i < 0 ? pair : pair.slice(0, i);
    const v = i < 0 ? '' : pair.slice(i + 1);
    try {
      out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      authError('Kirish ma\'lumoti buzilgan');
    }
  }
  return out;
}

export interface TgUser { id: number; first_name?: string; [k: string]: unknown }

/**
 * Telegram Mini App initData tekshiruvi:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyInitData(initData: unknown, token: string, now = nowMs()): Promise<TgUser> {
  if (!initData || typeof initData !== 'string' || initData.length > 4096) authError('Telegram orqali kiring');
  const data = parseQuery(initData as string);
  const hash = data.hash;
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) authError('Imzo yo\'q');
  const checkString = Object.keys(data).filter((k) => k !== 'hash').sort().map((k) => k + '=' + data[k]).join('\n');
  const secret = await hmacSha256(enc.encode('WebAppData'), enc.encode(token));
  const calc = toHex(await hmacSha256(secret, enc.encode(checkString)));
  if (!safeEqual(calc, hash)) authError('Imzo noto\'g\'ri');
  const authDate = Number(data.auth_date) || 0;
  const nowSec = Math.floor(now / 1000);
  if (!authDate || nowSec - authDate > INIT_DATA_MAX_AGE_SEC) authError('Sessiya eskirgan, ilovani qayta oching');
  if (authDate - nowSec > 300) authError('Sessiya vaqti noto\'g\'ri');
  let user: TgUser | null = null;
  try { user = JSON.parse(data.user || 'null'); } catch { user = null; }
  if (!user || !user.id) authError('Telegram foydalanuvchisi topilmadi');
  return user as TgUser;
}

// ---------- Ma'lumot yuklash ----------

const pg = (name: string) => (L.TABLE_NAMES as Record<string, string>)[name];

type Scope = { kind: 'all'; withAudit?: boolean } | { kind: 'client'; clientId: string } | { kind: 'new' };

async function loadTables(tx: Sql, scope: Scope): Promise<Record<string, Json[]>> {
  const names = Object.keys(L.TABLE_NAMES).filter((n) => n !== 'Audit');
  const jobs: Record<string, Promise<Json[]>> = {};
  if (scope.kind === 'all') {
    for (const n of names) jobs[n] = tx`select * from ${tx(pg(n))} order by tartib`;
    if (scope.withAudit) jobs.Audit = tx`select * from audit order by tartib`;
  } else {
    for (const n of REFERENCE) jobs[n] = tx`select * from ${tx(pg(n))} order by tartib`;
    if (scope.kind === 'client') {
      const cid = scope.clientId;
      jobs.Mijozlar = tx`select * from mijozlar where id = ${cid} order by tartib`;
      jobs.Manzillar = tx`select * from manzillar where mijoz_id = ${cid} order by tartib`;
      jobs.Buyurtmalar = tx`select * from buyurtmalar where mijoz_id = ${cid} order by tartib`;
      jobs.Yetkazishlar = tx`select * from yetkazishlar where mijoz_id = ${cid} order by tartib`;
      jobs.Tolovlar = tx`select t.* from tolovlar t join buyurtmalar b on b.id = t.buyurtma_id where b.mijoz_id = ${cid} order by t.tartib`;
      jobs.KeshbekHarakat = tx`select * from keshbek_harakat where mijoz_id = ${cid} order by tartib`;
    } else {
      // ro'yxatdan o'tmagan foydalanuvchi: telefon takrorlanishini tekshirish uchun mijozlar ro'yxati kerak
      jobs.Mijozlar = tx`select * from mijozlar order by tartib`;
      for (const n of CLIENT_OWNED) if (n !== 'Mijozlar') jobs[n] = Promise.resolve([]);
    }
  }
  const keys = Object.keys(jobs);
  const res = await Promise.all(keys.map((k) => jobs[k]));
  const out: Record<string, Json[]> = {};
  keys.forEach((k, i) => { out[k] = Array.from(res[i] as Json[]); });
  return out;
}

async function loadKesh(tx: Sql, keys: string[]): Promise<Record<string, { qiymat: string; tugash: number }>> {
  if (!keys.length) return {};
  const rows = await tx`select kalit, qiymat, tugash from kesh where kalit = any(${keys})`;
  const out: Record<string, { qiymat: string; tugash: number }> = {};
  for (const r of rows) out[r.kalit] = { qiymat: r.qiymat, tugash: r.tugash ? new Date(r.tugash).getTime() : 0 };
  return out;
}

async function loadAllKesh(tx: Sql) {
  const rows = await tx`select kalit, qiymat, tugash from kesh where kalit like 'job_%' or kalit like 'upd_%' or kalit like 'contact_%' or kalit like 'loc_%'`;
  const out: Record<string, { qiymat: string; tugash: number }> = {};
  for (const r of rows) out[r.kalit] = { qiymat: r.qiymat, tugash: r.tugash ? new Date(r.tugash).getTime() : 0 };
  return out;
}

// ---------- Yozuvlarni bajarish ----------

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

async function applyOps(tx: Sql, storage: Storage, ops: Op[]): Promise<void> {
  // 1) rasmlar (yopiq bucket) — DB yozuvidan oldin; yuklash xato bo'lsa tranzaksiya bekor bo'ladi
  const uploads = ops.filter((o) => o.op === 'upload') as Extract<Op, { op: 'upload' }>[];
  await Promise.all(uploads.map((u) => storage.upload(u.bucket, u.path, base64ToBytes(u.base64), u.contentType)));
  // 2) DB yozuvlari — navbat tartibida (postgres.js bitta ulanishda pipeline qiladi)
  const queries: Promise<unknown>[] = [];
  for (const o of ops) {
    if (o.op === 'insert') {
      for (let i = 0; i < o.rows.length; i += INSERT_CHUNK) {
        const chunk = o.rows.slice(i, i + INSERT_CHUNK);
        const cols = Object.keys(chunk[0]);
        queries.push(tx`insert into ${tx(o.table)} ${tx(chunk, cols)}`);
      }
    } else if (o.op === 'update') {
      const cols = Object.keys(o.patch);
      if (cols.length) queries.push(tx`update ${tx(o.table)} set ${tx(o.patch, cols)} where ${tx(o.key)} = ${o.val}`);
    } else if (o.op === 'kesh') {
      const tugash = new Date(o.tugash).toISOString();
      queries.push(tx`insert into kesh (kalit, qiymat, tugash) values (${o.kalit}, ${o.qiymat}, ${tugash})
        on conflict (kalit) do update set qiymat = excluded.qiymat, tugash = excluded.tugash`);
    }
  }
  await Promise.all(queries);
}

// ---------- Runtime ----------

export function createRuntime(opts: RuntimeOptions) {
  const { sql, env, storage } = opts;
  const doFetch = opts.fetch || fetch;
  const adminIds = String(env.ADMIN_TG_IDS || '').split(',').map((x) => x.trim()).filter((x) => /^\d+$/.test(x));

  function setEnv() {
    Object.assign(L.ENV_, { WEBAPP_URL: env.WEBAPP_URL || '', ADMIN_TG_IDS: adminIds, ALLOW_TEST_SEED: env.ALLOW_TEST_SEED || '' });
  }

  async function lock(tx: Sql) {
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`;
    if (opts.onLock) opts.onLock();
  }

  /** Telegramga xabarlar (commit dan keyin). Xato asosiy amalni buzmaydi. */
  async function sendMessages(list: Json[]): Promise<void> {
    if (!list.length || !env.BOT_TOKEN) return;
    const url = 'https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage';
    for (let i = 0; i < list.length; i += 25) {
      await Promise.allSettled(list.slice(i, i + 25).map((m) =>
        doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) })
      ));
    }
  }

  /** Daqiqasiga so'rovlar chegarasi (11.2). Alohida (avtokommit) — rad etilgan so'rov ham hisoblanadi. */
  async function rateLimit(tgId: string): Promise<void> {
    const minute = String(Math.floor(nowMs() / 60000));
    const key = 'rl_' + tgId;
    const tugash = new Date(nowMs() + 120000).toISOString();
    const [row] = await sql`
      insert into kesh (kalit, qiymat, tugash) values (${key}, ${minute + ':1'}, ${tugash})
      on conflict (kalit) do update set
        qiymat = case when split_part(kesh.qiymat, ':', 1) = ${minute}
                      then ${minute} || ':' || (split_part(kesh.qiymat, ':', 2)::int + 1)
                      else ${minute + ':1'} end,
        tugash = excluded.tugash
      returning split_part(qiymat, ':', 2)::int as n,
        coalesce((select qiymat::int from sozlama where kalit = 'rate_limit_daqiqa'), 60) as lim`;
    if (row.n > row.lim) throw new AppError('Juda ko\'p so\'rov. Bir daqiqadan keyin urinib ko\'ring', 'limit');
  }

  async function backupNow(): Promise<string> {
    const day = new Date(nowMs() + 5 * 3600 * 1000).toISOString().slice(0, 10);
    const dump: Record<string, unknown> = { vaqt: new Date(nowMs()).toISOString() };
    for (const name of Object.values(L.TABLE_NAMES as Record<string, string>)) {
      dump[name] = await sql`select * from ${sql(name)} order by tartib`;
    }
    dump.kesh_soni = (await sql`select count(*)::int as n from kesh`)[0].n;
    const bytes = enc.encode(JSON.stringify(dump));
    await storage.upload('zaxira', 'kunlik/' + day + '.json', bytes, 'application/json', true);
    if (day.slice(8, 10) === '01') {
      await storage.upload('zaxira', 'arxiv/' + day.slice(0, 7) + '.json', bytes, 'application/json', true);
    }
    // TZ 11.4: kunlik nusxalar oxirgi 30 kun saqlanadi, oylik arxiv doimiy
    const limit = new Date(nowMs() + 5 * 3600 * 1000 - 30 * 86400000).toISOString().slice(0, 10);
    const old = (await storage.list('zaxira', 'kunlik')).map((f) => f.name)
      .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n) && n.slice(0, 10) < limit);
    if (old.length) await storage.remove('zaxira', old.map((n) => 'kunlik/' + n));
    return 'kunlik/' + day + '.json';
  }

  async function finish(taken: { notify: Json[]; backup: boolean }) {
    const work = (async () => {
      await sendMessages(taken.notify);
      if (taken.backup) {
        try { await backupNow(); } catch (e) { console.error('Zaxira xatosi', e); }
      }
    })();
    // Edge Runtime'da javob Telegram/zaxirani kutmaydi (fonda tugaydi); testlarda kutiladi
    const er = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
    if (er && typeof er.waitUntil === 'function') er.waitUntil(work);
    else await work;
  }

  /** Mini App so'rovi: { action, initData, payload } → { ok, data } | { ok:false, error, code } */
  async function handleApi(body: unknown): Promise<Json> {
    try {
      const b = body as { action?: string; initData?: string; payload?: unknown };
      if (!b || typeof b !== 'object') throw new AppError('So\'rov noto\'g\'ri');
      const info = L.actionInfo_(b.action);
      if (!info) throw new AppError('Noma\'lum amal', 'amal');
      const tgUser = await verifyInitData(b.initData, env.BOT_TOKEN);
      const tgId = String(tgUser.id);
      await rateLimit(tgId);
      const needWrite = info.w || adminIds.includes(tgId);
      const result = await sql.begin(async (tx: Sql) => {
        if (needWrite) await lock(tx);
        const [u] = await tx`select id, rol from foydalanuvchilar where tg_id = ${tgId} and faol limit 1`;
        let scope: Scope = { kind: 'all', withAudit: b.action === 'audit' };
        if (!u) {
          scope = adminIds.includes(tgId) ? { kind: 'all' } : { kind: 'new' };
        } else if (u.rol === 'mijoz') {
          const [c] = await tx`select id from mijozlar where tg_id = ${tgId} and faol limit 1`;
          scope = c ? { kind: 'client', clientId: c.id } : { kind: 'new' };
        }
        const data = await loadTables(tx, scope);
        const kesh = await loadKesh(tx, ['contact_' + tgId, 'loc_' + tgId]);
        // --- sinxron qism: shu yerda await yo'q, bir izolyatsiyadagi parallel so'rovlar aralashmaydi ---
        setEnv();
        L.dbInstall_(data, kesh);
        const out = L.runAction_(b.action, tgUser, b.payload);
        const taken = L.dbTake_();
        // ---
        if (taken.ops.length && !needWrite) await lock(tx); // kutilmagan yozuv ham qulf ostida
        await applyOps(tx, storage, taken.ops as Op[]);
        return { out, taken };
      });
      await finish(result.taken);
      let out = result.out as Json | null;
      const file = out && (out.data as { __file?: string } | undefined);
      if (file && file.__file) {
        const ref = file.__file;
        const i = ref.indexOf('/');
        const f = await storage.download(ref.slice(0, i), ref.slice(i + 1));
        out = { data: 'data:' + f.contentType + ';base64,' + bytesToBase64(f.bytes) };
      }
      return { ok: true, data: out === undefined ? null : out };
    } catch (e) {
      return L.errorResponse_(e);
    }
  }

  /** Telegram webhook. secretHeader = X-Telegram-Bot-Api-Secret-Token. */
  async function handleWebhook(update: Json, secretHeader: string | null): Promise<{ status: number; body: Json }> {
    if (!env.WEBHOOK_SECRET || !secretHeader || !safeEqual(secretHeader, env.WEBHOOK_SECRET)) {
      return { status: 401, body: { ok: false } };
    }
    try {
      const msg = (update && update.message) as Json | undefined;
      let photo = '';
      const photos = msg && (msg.photo as { file_id: string }[] | undefined);
      if (photos && photos.length) photo = await downloadTelegramPhoto(photos[photos.length - 1].file_id);
      const taken = await sql.begin(async (tx: Sql) => {
        await lock(tx);
        const data = await loadTables(tx, { kind: 'all' });
        const kesh = await loadAllKesh(tx);
        setEnv();
        L.dbInstall_(data, kesh);
        L.handleTelegramUpdate_(update, photo);
        const t = L.dbTake_();
        await applyOps(tx, storage, t.ops as Op[]);
        return t;
      });
      await finish(taken);
    } catch (e) {
      console.error('Webhook xatosi', e);
    }
    // Telegram qayta yubormasligi uchun har doim 200
    return { status: 200, body: { ok: true } };
  }

  async function downloadTelegramPhoto(fileId: string): Promise<string> {
    try {
      const r = await doFetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/getFile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: fileId })
      });
      const info = await r.json();
      if (!info.ok) return '';
      const f = await doFetch('https://api.telegram.org/file/bot' + env.BOT_TOKEN + '/' + info.result.file_path);
      const bytes = new Uint8Array(await f.arrayBuffer());
      return 'data:image/jpeg;base64,' + bytesToBase64(bytes);
    } catch {
      return '';
    }
  }

  /** pg_cron har 15 daqiqada chaqiradi. secretHeader = x-cron-secret. */
  async function handleCron(secretHeader: string | null): Promise<{ status: number; body: Json }> {
    if (!env.CRON_SECRET || !secretHeader || !safeEqual(secretHeader, env.CRON_SECRET)) {
      return { status: 401, body: { ok: false } };
    }
    try {
      const result = await sql.begin(async (tx: Sql) => {
        await lock(tx);
        const data = await loadTables(tx, { kind: 'all' });
        const kesh = await loadAllKesh(tx);
        setEnv();
        L.dbInstall_(data, kesh);
        const out = L.cronTick_();
        const t = L.dbTake_();
        await applyOps(tx, storage, t.ops as Op[]);
        return { out, t };
      });
      await finish(result.t);
      return { status: 200, body: { ok: true, data: result.out } };
    } catch (e) {
      console.error('Cron xatosi', e);
      return { status: 500, body: { ok: false, error: String((e as Error).message || e) } };
    }
  }

  /** Xizmat vazifalari (HTTP orqali ochilmagan): seedExample, seedTestData. */
  async function runTask(name: 'seedExample' | 'seedTestData'): Promise<void> {
    const taken = await sql.begin(async (tx: Sql) => {
      await lock(tx);
      const data = await loadTables(tx, { kind: 'all' });
      setEnv();
      L.dbInstall_(data, {});
      if (name === 'seedExample') L.seedExample_(); else L.seedTestData_();
      const t = L.dbTake_();
      await applyOps(tx, storage, t.ops as Op[]);
      return t;
    });
    await finish({ notify: [], backup: taken.backup });
  }

  return { handleApi, handleWebhook, handleCron, runTask, backupNow };
}

/** CORS: Mini App GitHub Pages'da, funksiya supabase.co da. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400'
};
