// supabase/logic/*.js (biznes mantiq) → supabase/functions/_shared/logic.ts (bitta ES modul).
// Ishlatish: node scripts/build-logic.mjs        Tekshirish (CI): node scripts/build-logic.mjs --check
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'supabase', 'logic');
const out = join(root, 'supabase', 'functions', '_shared', 'logic.ts');
const EXPORTS = [
  'SCHEMA', 'TABLE_NAMES', 'ROLES', 'AppError', 'ENV_',
  'dbInstall_', 'dbTake_', 'runAction_', 'actionInfo_', 'errorResponse_',
  'handleTelegramUpdate_', 'cronTick_', 'seedExample_', 'seedTestData_', 'setting_', 'normalizeRow_'
];

const files = readdirSync(src).filter((f) => f.endsWith('.js')).sort();
let code = '// AVTOMATIK YARATILGAN FAYL — tahrirlamang. Manba: supabase/logic/*.js\n' +
  '// Yig\'ish: node scripts/build-logic.mjs\n' +
  '// Biznes mantiq Apps Script versiyasidan o\'zgarishsiz ko\'chirilgan (TZ 5, 9, 10-bo\'limlar).\n' +
  '// deno-lint-ignore-file\n// @ts-nocheck\n\n';
for (const f of files) code += `// ===== ${f} =====\n` + readFileSync(join(src, f), 'utf8') + '\n';
code += '\n// ENV_ obyekt — runtime uning maydonlarini o\'rnatadi\nexport { ' + EXPORTS.join(', ') + ' };\n';

if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== code) {
    console.error('logic.ts eskirgan: node scripts/build-logic.mjs ni ishga tushiring');
    process.exit(1);
  }
  console.log('logic.ts dolzarb');
} else {
  writeFileSync(out, code);
  console.log('Yozildi: ' + out + ' (' + files.length + ' fayl)');
}
