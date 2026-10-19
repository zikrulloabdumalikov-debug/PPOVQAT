/** Kaloriya oralig'i, 6 kunlik menyu va menyu (katalog) rasmlari. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, PNG } from './helpers.mjs';

test('Ratsion: kaloriya oralig\'i va tavsif mijozga ko\'rinadi; menyu kuni hafta kuniga qarab', async () => {
  const env = await makeEnv();
  const menyu = 'Nonushta: suli bo\'tqasi\nTushlik: tovuq, grechka\nKechki: baliq';
  await env.ok(env.IDS.partner, 'rationSave', {
    id: env.ration.id, nom: 'Ozish Express', kaloriya: '900–1000', tavsif: menyu,
    tannarx_ovqat: 44800, tannarx_qadoq_yetkazish: 22000, faol: true
  });
  const cat = await env.ok(env.IDS.clientA, 'discounts');
  assert.equal(cat.ratsionlar[0].kaloriya, '900–1000');
  assert.equal(cat.ratsionlar[0].tavsif, menyu);
  const home = await env.ok(env.IDS.clientA, 'home');
  // 2026-10-13 seshanba → menyuning 2-kuni, ertaga 3-kun
  assert.deepEqual(home.menyu_kuni, { bugun: 2, ertaga: 3 });
  // juda uzun kaloriya matni rad etiladi
  const r = await env.api(env.IDS.partner, 'rationSave', { id: env.ration.id, nom: 'X', kaloriya: 'x'.repeat(40) });
  assert.equal(r.ok, false);
});

test('Katalog: xodim rasm yuklaydi, mijoz ko\'radi; mijoz yuklay olmaydi', async () => {
  const env = await makeEnv();
  assert.deepEqual((await env.ok(env.IDS.clientA, 'catalog')).rasmlar, []);
  assert.equal((await env.ok(env.IDS.clientA, 'home')).katalog_bor, false);
  await env.ok(env.IDS.operator, 'catalogAdd', { rasm: PNG, nom: '1-sahifa' });
  const v = await env.ok(env.IDS.partner, 'catalogAdd', { rasm: PNG, nom: '2-sahifa' });
  assert.equal(v.rasmlar.length, 2);
  const c = await env.ok(env.IDS.clientA, 'catalog');
  assert.deepEqual(c.rasmlar.map((x) => x.nom), ['1-sahifa', '2-sahifa']);
  assert.match(c.rasmlar[0].url, /^https:\/\/test\.supabase\.co\/storage\/v1\/object\/public\/katalog\/katalog_.*\.png$/);
  assert.equal([...env.files.keys()].filter((k) => k.startsWith('katalog/')).length, 2);
  assert.equal((await env.ok(env.IDS.clientA, 'home')).katalog_bor, true);
  // tartibni o'zgartirish va olib tashlash
  await env.ok(env.IDS.partner, 'catalogMove', { i: 1, yon: 'yuqori' });
  assert.deepEqual((await env.ok(env.IDS.clientB, 'catalog')).rasmlar.map((x) => x.nom), ['2-sahifa', '1-sahifa']);
  await env.ok(env.IDS.partner, 'catalogRemove', { i: 0 });
  assert.deepEqual((await env.ok(env.IDS.clientB, 'catalog')).rasmlar.map((x) => x.nom), ['1-sahifa']);
  // fayl o'chirilmaydi (faqat ro'yxatdan olinadi)
  assert.equal([...env.files.keys()].filter((k) => k.startsWith('katalog/')).length, 2);
  // ruxsat va tekshiruv
  assert.equal((await env.api(env.IDS.clientA, 'catalogAdd', { rasm: PNG })).code, 'ruxsat');
  assert.equal((await env.api(env.IDS.courier, 'catalogRemove', { i: 0 })).code, 'ruxsat');
  assert.equal((await env.api(env.IDS.partner, 'catalogAdd', { rasm: 'data:application/pdf;base64,AAAA' })).ok, false);
});
