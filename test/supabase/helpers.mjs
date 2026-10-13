// Supabase backend uchun sinov muhiti: har test — template'dan yangi Postgres baza,
// haqiqiy runtime (Edge Function kodi), soxta Telegram (fetch) va xotiradagi Storage.
import { after } from 'node:test';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { createRuntime } from '../../supabase/functions/_shared/runtime.ts';
import * as L from '../../supabase/functions/_shared/logic.ts';

export const TOKEN = '123456:TEST-BOT-TOKEN';
export const IDS = { partner: '1000001', partner2: '1000002', operator: '2000001', courier: '3000001', clientA: '5000001', clientB: '5000002' };
export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const BASE = process.env.SOGLOM_PG_BASE;
if (!BASE) throw new Error('Testlarni "npm run test:supabase" orqali ishga tushiring');
const admin = postgres(BASE + 'postgres', { max: 1, onnotice: () => {} });
const open = [];
let dbSeq = 0;
let updSeq = 1000;

after(async () => {
  await Promise.all(open.map((s) => s.end({ timeout: 1 })));
  await admin.end({ timeout: 1 });
});

export function signInitData(token, user, authDateSec, extra = {}) {
  const fields = { auth_date: String(authDateSec), query_id: 'AAE' + user.id, user: JSON.stringify(user), ...extra };
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

function setTashkent(date, hm = '10:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  globalThis.__NOW__ = Date.UTC(y, m - 1, d, h - 5, mi, 0);
}

export async function makeEnv(opts = {}) {
  setTashkent(opts.date || '2026-10-13', opts.time || '10:00');
  const dbName = 'e_' + process.pid + '_' + (++dbSeq);
  await admin.unsafe(`create database ${dbName} template soglom_tmpl`);
  const sql = postgres(BASE + dbName, { max: 3, prepare: false, onnotice: () => {}, connection: { TimeZone: 'Asia/Tashkent' } });
  open.push(sql);

  const sent = [];
  const files = new Map();
  const stats = { locks: 0 };
  const fakeFetch = async (url, init) => {
    const u = String(url);
    if (u.endsWith('/getFile')) return new Response(JSON.stringify({ ok: true, result: { file_path: 'photos/x.jpg' } }));
    if (u.includes('/file/bot')) return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    sent.push({ url: u, payload: init && init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ ok: true, result: {} }));
  };
  const storage = {
    async upload(bucket, path, bytes, contentType, upsert) {
      const k = bucket + '/' + path;
      if (files.has(k) && !upsert) throw new Error('mavjud: ' + k);
      files.set(k, { bytes, contentType, created: globalThis.__NOW__ });
    },
    async download(bucket, path) {
      const f = files.get(bucket + '/' + path);
      if (!f) throw new Error('topilmadi');
      return { bytes: f.bytes, contentType: f.contentType };
    },
    async list(bucket, prefix) {
      return [...files.keys()].filter((k) => k.startsWith(bucket + '/' + prefix + '/')).map((k) => ({ name: k.split('/').pop() }));
    },
    async remove(bucket, paths) { paths.forEach((p) => files.delete(bucket + '/' + p)); }
  };
  const env = {
    BOT_TOKEN: TOKEN, ADMIN_TG_IDS: IDS.partner + ',' + IDS.partner2, WEBAPP_URL: 'https://example.test/app/',
    WEBHOOK_SECRET: 'whsec-test', CRON_SECRET: 'crsec-test', ALLOW_TEST_SEED: 'ha'
  };
  const rt = createRuntime({ sql, env, storage, fetch: fakeFetch, onLock: () => { stats.locks++; } });
  await rt.runTask('seedExample');

  const api = async (tgId, action, payload, extra) => {
    const nowSec = Math.floor(globalThis.__NOW__ / 1000);
    const initData = (extra && extra.initData) || signInitData(TOKEN, { id: Number(tgId), first_name: 'T' + tgId }, nowSec);
    return JSON.parse(JSON.stringify(await rt.handleApi({ action, initData, payload: payload || {} })));
  };
  const ok = async (tgId, action, payload) => {
    const r = await api(tgId, action, payload);
    if (!r.ok) throw new Error(action + ': ' + r.error + ' [' + r.code + ']');
    return r.data;
  };
  const webhook = async (update, secret = env.WEBHOOK_SECRET) => {
    if (update.update_id === undefined) update.update_id = ++updSeq;
    return rt.handleWebhook(update, secret);
  };
  const shareContact = (tgId, phone) => webhook({
    message: { from: { id: Number(tgId) }, chat: { id: Number(tgId), type: 'private' }, contact: { phone_number: phone, user_id: Number(tgId) } }
  });
  const register = async (tgId, phone, ism, hudud) => {
    await shareContact(tgId, phone);
    return ok(tgId, 'register', {
      ism, manba: 'Instagram', rozilik: true,
      manzil: { nom: 'Uy', lat: 41.31, lng: 69.28, matn: 'Chilonzor 9-kvartal, 12-uy', moljal: 'ko\'k darvoza', hudud: hudud || 'Chilonzor' }
    });
  };
  /** Jadval qatorlari (mantiqdagi ko'rinishda: bo'sh matn '', son number). */
  const rows = async (sheet) => {
    const pgName = L.TABLE_NAMES[sheet];
    const res = await sql`select * from ${sql(pgName)} order by tartib`;
    return res.map((r) => L.normalizeRow_(sheet, r));
  };

  const e = {
    sql, api, ok, register, shareContact, webhook, rows, IDS, TOKEN, sent, files, stats, rt,
    setTashkent,
    now: () => globalThis.__NOW__,
    clearSent: () => { sent.length = 0; },
    cron: (secret = env.CRON_SECRET) => rt.handleCron(secret),
    seedTest: () => rt.runTask('seedTestData'),
    msgsTo: (tg) => sent.filter((m) => m.payload && m.payload.chat_id === String(tg)).map((m) => m.payload.text)
  };

  await ok(IDS.partner, 'userSave', { tg_id: IDS.operator, rol: 'operator', ism: 'Operator' });
  await ok(IDS.partner, 'userSave', { tg_id: IDS.courier, rol: 'kuryer', ism: 'Kuryer Ali' });
  await ok(IDS.partner, 'settingsSave', { qiymatlar: { karta_raqami: '8600 1234 5678 9012', karta_egasi: 'Sherik 1', kuryer_guruh_chat_id: '-100555' } });
  if (opts.clients !== false) {
    await register(IDS.clientA, '+998901112233', 'Aziza');
    await register(IDS.clientB, '+998907778899', 'Bobur', 'Yunusobod');
  }
  e.partnerUser = (await rows('Foydalanuvchilar')).find((u) => u.tg_id === IDS.partner);
  const pricing = await ok(IDS.partner, 'pricing');
  e.pricing = pricing;
  e.ration = pricing.ratsionlar[0];
  e.pkg = (days) => pricing.paketlar_joriy.find((p) => p.kunlar === days);
  return e;
}

/** Mijoz buyurtma beradi, chek yuboradi, operator tasdiqlaydi. */
export async function placePaidOrder(env, tgId, days, opts = {}) {
  const form = await env.ok(tgId, 'orderForm');
  const order = await env.ok(tgId, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(days).id, boshlanish: opts.boshlanish || form.eng_erta,
    manzil_id: form.manzillar[0].id, use_cashback: !!opts.use_cashback
  });
  if (order.holat !== 'tolov_kutish') return order;
  await env.ok(tgId, 'submitPayment', { buyurtma_id: order.id, usul: 'karta', chek: PNG });
  const pay = (await env.rows('Tolovlar')).filter((p) => p.buyurtma_id === order.id && p.holat === 'kutilmoqda')[0];
  const res = await env.ok(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });
  return Object.assign(res.buyurtma, { tolov_id: pay.id });
}

/** Kun bo'yicha kuryer hamma kartani belgilaydi. fn(card) → 'ok' | sabab. */
export async function courierDay(env, date, fn) {
  setTashkent(date, '11:00');
  const list = await env.ok(env.IDS.courier, 'courierToday');
  for (const c of list.guruhlar.flatMap((g) => g.items)) {
    const r = fn ? fn(c) : 'ok';
    if (r === 'ok') await env.ok(env.IDS.courier, 'courierDelivered', { id: c.id });
    else if (r) await env.ok(env.IDS.courier, 'courierFailed', { id: c.id, sabab: r });
  }
}
