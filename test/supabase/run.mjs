// Supabase backend testlari: lokal Postgres 16 klasterini ko'taradi, migratsiyalarni qo'llaydi,
// node --test ni ishga tushiradi va klasterni to'xtatadi.
// Tayyor baza bo'lsa: SOGLOM_PG_URL=postgres://user@host:port/ node test/supabase/run.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.env.SOGLOM_PG_PORT || '54329';
const asPg = (cmd, args) => {
  const isRoot = process.getuid && process.getuid() === 0;
  const r = isRoot ? spawnSync('runuser', ['-u', 'postgres', '--', cmd, ...args], { encoding: 'utf8' })
    : spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(cmd + ' xato: ' + r.stderr + r.stdout);
  return r.stdout;
};
// istalgan o'rnatilgan Postgres versiyasini topadi (eng yangisi birinchi)
const findBin = (name) => {
  let versions = [];
  try { versions = readdirSync('/usr/lib/postgresql').sort((a, b) => Number(b) - Number(a)); } catch { /* yo'q */ }
  for (const v of versions) {
    const p = `/usr/lib/postgresql/${v}/bin/${name}`;
    try { readFileSync(p); return p; } catch { /* keyingisi */ }
  }
  return name;
};

let base = process.env.SOGLOM_PG_URL;
let dataDir = null;
if (!base) {
  dataDir = mkdtempSync(join(tmpdir(), 'soglom-pg-'));
  chmodSync(dataDir, 0o777);
  if (process.getuid && process.getuid() === 0) spawnSync('chown', ['postgres', dataDir]);
  asPg(findBin('initdb'), ['-D', dataDir, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
  asPg(findBin('pg_ctl'), ['-D', dataDir, '-l', join(dataDir, 'log'), '-w', '-o',
    `-p ${PORT} -k /tmp -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c max_connections=300`, 'start']);
  base = `postgres://postgres@127.0.0.1:${PORT}/`;
}

let code = 1;
try {
  // migratsiyalar Node orqali (psql klienti shart emas)
  const admin = postgres(base + 'postgres', { max: 1, onnotice: () => {} });
  await admin.unsafe('drop database if exists soglom_tmpl');
  await admin.unsafe('create database soglom_tmpl');
  await admin.end();
  const tmpl = postgres(base + 'soglom_tmpl', { max: 1, onnotice: () => {} });
  const migDir = join(root, 'supabase', 'migrations');
  for (const f of readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    try { await tmpl.unsafe(readFileSync(join(migDir, f), 'utf8')); } catch (e) { throw new Error(f + ': ' + e.message); }
  }
  await tmpl.end();
  const files = readdirSync(join(root, 'test', 'supabase')).filter((f) => f.endsWith('.test.mjs')).map((f) => join('test', 'supabase', f));
  const args = ['--test', '--test-concurrency=1', ...process.argv.slice(2), ...files];
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, SOGLOM_PG_BASE: base } });
  code = r.status;
} finally {
  if (dataDir) {
    try { asPg(findBin('pg_ctl'), ['-D', dataDir, '-m', 'immediate', 'stop']); } catch { /* */ }
    rmSync(dataDir, { recursive: true, force: true });
  }
}
process.exit(code);
