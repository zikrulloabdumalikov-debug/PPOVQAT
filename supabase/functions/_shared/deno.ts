/**
 * Deno (Supabase Edge Functions) uchun ulanishlar: Postgres, Storage, sir kalitlar.
 * Sir kalitlar faqat Supabase Secrets / avtomatik muhit o'zgaruvchilaridan o'qiladi.
 */
import postgres from 'npm:postgres@3.4.5';
import { createRuntime, type Storage } from './runtime.ts';

function must(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(name + ' sozlanmagan (Supabase → Edge Functions → Secrets)');
  return v;
}

/** Supabase Storage REST (service role — faqat serverda). */
export function supabaseStorage(url: string, serviceKey: string): Storage {
  const h = { Authorization: 'Bearer ' + serviceKey, apikey: serviceKey };
  const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
  return {
    async upload(bucket, path, bytes, contentType, upsert) {
      const r = await fetch(`${url}/storage/v1/object/${bucket}/${enc(path)}`, {
        method: 'POST', headers: { ...h, 'Content-Type': contentType, 'x-upsert': upsert ? 'true' : 'false' }, body: bytes
      });
      if (!r.ok) throw new Error('Storage yuklash xatosi: ' + r.status + ' ' + (await r.text()));
    },
    async download(bucket, path) {
      const r = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${enc(path)}`, { headers: h });
      if (!r.ok) throw new Error('Rasm topilmadi');
      return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'image/jpeg' };
    },
    async list(bucket, prefix) {
      const r = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
        method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
      });
      if (!r.ok) return [];
      return await r.json();
    },
    async remove(bucket, paths) {
      await fetch(`${url}/storage/v1/object/${bucket}`, {
        method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths })
      });
    }
  };
}

let runtime: ReturnType<typeof createRuntime> | null = null;

export function getRuntime() {
  if (runtime) return runtime;
  const sql = postgres(must('SUPABASE_DB_URL'), {
    prepare: false, // Supavisor (transaction mode) bilan mos
    max: 4,
    idle_timeout: 20,
    connection: { TimeZone: 'Asia/Tashkent' }
  });
  runtime = createRuntime({
    sql,
    storage: supabaseStorage(must('SUPABASE_URL'), must('SUPABASE_SERVICE_ROLE_KEY')),
    env: {
      BOT_TOKEN: must('BOT_TOKEN'),
      WEBAPP_URL: Deno.env.get('WEBAPP_URL') || '',
      ADMIN_TG_IDS: Deno.env.get('ADMIN_TG_IDS') || '',
      WEBHOOK_SECRET: Deno.env.get('WEBHOOK_SECRET') || '',
      CRON_SECRET: Deno.env.get('CRON_SECRET') || '',
      PUBLIC_STORAGE_URL: must('SUPABASE_URL') + '/storage/v1/object/public/'
    }
  });
  return runtime;
}
