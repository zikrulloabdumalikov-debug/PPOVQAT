/** Istalgan kunlik buyurtma, kaloriya tavsiyasi va vazn statistikasi. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, PNG } from './helpers.mjs';

test('Buyurtma: istalgan kun soni (1 kundan 1 yilgacha), chegirma eng katta mos paketdan', async () => {
  const env = await makeEnv();
  const form = await env.ok(env.IDS.clientA, 'orderForm');
  const q = (kunlar) => env.api(env.IDS.clientA, 'quote', { ratsion_id: env.ration.id, kunlar });
  // seed paketlari: 6 kun 0%, 12 kun 5%, 24 kun 10%; narx 120 000
  const q1 = (await q(1)).data;
  assert.equal(q1.kunlar, 1); assert.equal(q1.chegirma_foiz, 0); assert.equal(q1.jami, 120000);
  assert.equal((await q(11)).data.chegirma_foiz, 0);
  assert.equal((await q(15)).data.chegirma_foiz, 5);
  const q30 = (await q(30)).data;
  assert.equal(q30.chegirma_foiz, 10); assert.equal(q30.jami, 30 * 120000 * 0.9);
  const qYil = (await q(312)).data;
  assert.equal(qYil.chegirma_foiz, 10);
  assert.ok(qYil.tugash >= '2027-10-01', 'bir yillik buyurtma ~1 yil davom etadi: ' + qYil.tugash);
  assert.equal((await q(0)).ok, false);
  assert.equal((await q(1000)).ok, false);
  assert.equal((await q(2.5)).ok, false);

  const order = await env.ok(env.IDS.clientA, 'createOrder', {
    ratsion_id: env.ration.id, kunlar: 30, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id
  });
  assert.equal(order.kunlar, 30);
  assert.equal(order.chegirma_foiz, 10);
  assert.equal((await env.rows('Buyurtmalar')).find((x) => x.id === order.id).paket_id, env.pkg(24).id);
  assert.equal(order.tolanadi, 3240000);
  await env.ok(env.IDS.clientA, 'submitPayment', { buyurtma_id: order.id, usul: 'karta', chek: PNG });
  const pay = (await env.rows('Tolovlar')).find((p) => p.buyurtma_id === order.id);
  await env.ok(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });
  const ds = (await env.rows('Yetkazishlar')).filter((d) => d.buyurtma_id === order.id);
  assert.equal(ds.length, 30);
  assert.ok(ds.every((d) => new Date(d.sana + 'T00:00:00Z').getUTCDay() !== 0), 'yakshanba yetkazilmaydi');

  // 1 kunlik buyurtma — paketsiz
  const one = await env.ok(env.IDS.clientB, 'createOrder', {
    ratsion_id: env.ration.id, kunlar: 1, manzil_id: (await env.ok(env.IDS.clientB, 'orderForm')).manzillar[0].id
  });
  assert.equal(one.kunlar, 1); assert.equal((await env.rows('Buyurtmalar')).find((x) => x.id === one.id).paket_id, ''); assert.equal(one.tolanadi, 120000);
});

test('Kaloriya tavsiyasi: bo\'y, vazn, maqsad va turmush tarziga qarab eng mos ratsion', async () => {
  const env = await makeEnv();
  const r2 = await env.ok(env.IDS.partner, 'rationSave', {
    nom: 'Vazn saqlash', kaloriya: '1500–1600', tavsif: 'Muvozanatli', tannarx_ovqat: 50000, tannarx_qadoq_yetkazish: 20000
  });
  await env.ok(env.IDS.partner, 'priceAdd', { ratsion_id: r2.id, kunlik_narx: 155000 });

  let h = await env.ok(env.IDS.clientA, 'health');
  assert.equal(h.toliq, false);
  assert.equal(h.tavsiya, null);
  assert.equal(h.sorash_kerak, false, 'vazn kiritilmagan — so\'ralmaydi');
  assert.equal(h.maqsadlar.length, 3);

  assert.equal((await env.api(env.IDS.clientA, 'healthSave', { vazn: 10 })).ok, false);
  assert.equal((await env.api(env.IDS.clientA, 'healthSave', { maqsad: 'yoq' })).ok, false);

  // ayol, 36 yosh, 165 sm, 80,5 kg, ofis: sarf ≈ 1794; ozish yengil (−275) → 1520 → 1500–1600 eng yaqin
  h = await env.ok(env.IDS.clientA, 'healthSave', {
    jins: 'ayol', tugilgan_yil: 1990, boy: 165, vazn: '80,5', maqsad: 'ozish', usul: 'yengil', faollik: 'ofis'
  });
  assert.equal(h.toliq, true);
  assert.equal(h.profil.vazn, 80.5);
  assert.equal(h.profil.usul, 'yengil');
  assert.equal(h.reja.sarf, 1790);
  assert.equal(h.kkal, 1520);
  assert.equal(h.reja.hafta_kg, -0.25);
  // o'rtacha usul (standart) → 1240 → 1200 lik ratsion
  assert.equal((await env.ok(env.IDS.clientA, 'healthSave', { usul: 'ortacha' })).kkal, 1240);
  assert.equal((await env.api(env.IDS.clientA, 'healthSave', { usul: 'juda_tez' })).ok, false);
  h = await env.ok(env.IDS.clientA, 'healthSave', { usul: 'yengil' });
  assert.equal(h.tavsiya.ratsion_id, r2.id);
  assert.equal(h.tavsiya.kunlik_narx, 155000);

  // maqsad o'zgardi → tavsiya ham o'zgaradi (sport bilan vazn olish → 1500–1600, kam harakat + ozish, yengil vazn → 1200)
  h = await env.ok(env.IDS.clientA, 'healthSave', { vazn: 60, boy: 155 });
  assert.equal(h.tavsiya.ratsion_id, env.ration.id);
  const home = await env.ok(env.IDS.clientA, 'home');
  assert.equal(home.salomatlik.toliq, true);
  assert.equal(home.salomatlik.tavsiya.ratsion_id, env.ration.id);
});

test('Vazn tarixi: bir kunda bitta yozuv, har 15 kunda bot so\'raydi, statistika', async () => {
  const env = await makeEnv();
  const profile = { jins: 'erkak', tugilgan_yil: 1985, boy: 180, maqsad: 'ozish', faollik: 'ortacha' };
  await env.ok(env.IDS.clientA, 'healthSave', { ...profile, vazn: 95 });
  await env.ok(env.IDS.clientA, 'healthSave', { vazn: 94.6 });
  let tarix = await env.rows('VaznTarix');
  assert.equal(tarix.length, 1, 'bir kunda bitta yozuv');
  assert.equal(tarix[0].vazn, 94.6);
  await env.ok(env.IDS.clientB, 'healthSave', { ...profile, vazn: 70 });

  // A ning faol buyurtmasi bor, B niki yo'q
  const form = await env.ok(env.IDS.clientA, 'orderForm');
  const o = await env.ok(env.IDS.clientA, 'createOrder', { ratsion_id: env.ration.id, kunlar: 60, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id });
  await env.ok(env.IDS.clientA, 'submitPayment', { buyurtma_id: o.id, usul: 'karta', chek: PNG });
  const pay = (await env.rows('Tolovlar')).find((p) => p.buyurtma_id === o.id);
  await env.ok(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });

  // 14 kun o'tdi — hali so'ralmaydi
  env.setTashkent('2026-10-27', '10:30');
  env.clearSent();
  await env.cron();
  assert.equal(env.msgsTo(env.IDS.clientA).filter((t) => t.includes('vazn')).length, 0);
  assert.equal((await env.ok(env.IDS.clientA, 'health')).sorash_kerak, false);

  // 15 kun — A ga xabar, B ga yo'q (faol buyurtmasi yo'q); qayta cron takrorlamaydi
  env.setTashkent('2026-10-28', '10:30');
  env.clearSent();
  await env.cron();
  await env.cron();
  assert.equal(env.msgsTo(env.IDS.clientA).filter((t) => t.includes('vazn')).length, 1);
  assert.equal(env.msgsTo(env.IDS.clientB).filter((t) => t.includes('vazn')).length, 0);
  assert.equal((await env.ok(env.IDS.clientA, 'health')).sorash_kerak, true);
  env.setTashkent('2026-10-29', '10:30');
  env.clearSent();
  await env.cron();
  assert.equal(env.msgsTo(env.IDS.clientA).filter((t) => t.includes('vazn')).length, 0, 'ertasiga yana so\'ramaydi');

  const h = await env.ok(env.IDS.clientA, 'healthSave', { vazn: 92 });
  assert.equal(h.sorash_kerak, false);
  assert.deepEqual(h.tarix.map((x) => x.vazn), [94.6, 92]);
  assert.deepEqual(h.statistika && h.statistika.ozgarish, -2.6);

  // mijoz faqat o'z tarixini ko'radi
  const hb = await env.ok(env.IDS.clientB, 'health');
  assert.deepEqual(hb.tarix.map((x) => x.vazn), [70]);

  // admin statistikasi; mijozga yopiq
  const st = await env.ok(env.IDS.operator, 'weightStats');
  assert.equal(st.jami, 2);
  assert.equal(st.ozdi, 1);
  assert.equal(st.items[0].ism, 'Aziza');
  assert.equal(st.items[0].ozgarish, -2.6);
  assert.equal((await env.api(env.IDS.clientA, 'weightStats')).ok, false);
  const card = await env.ok(env.IDS.operator, 'clientGet', { id: st.items[0].mijoz_id });
  assert.equal(card.salomatlik.tarix.length, 2);
});

test('Sozlanmagan ilova: admin ogohlantiriladi, tavsiya bo\'lmasa ham kaloriya ko\'rinadi', async () => {
  const env = await makeEnv();
  let t = await env.ok(env.IDS.partner, 'adminToday');
  assert.equal(t.sozlash.ratsion, 1);
  assert.equal(t.sozlash.katalog, 0);
  // yagona ratsion sotuvdan olinsa — tavsiya yo'q, lekin kaloriya hisoblanadi
  await env.ok(env.IDS.partner, 'rationSave', { id: env.ration.id, nom: env.ration.nom, kaloriya: '1200', faol: false, tannarx_ovqat: 44800, tannarx_qadoq_yetkazish: 22000 });
  t = await env.ok(env.IDS.partner, 'adminToday');
  assert.equal(t.sozlash.ratsion, 0);
  const h = await env.ok(env.IDS.clientA, 'healthSave', { jins: 'erkak', tugilgan_yil: 2004, boy: 182, vazn: 65, maqsad: 'vazn_olish', faollik: 'ofis' });
  assert.equal(h.toliq, true);
  assert.equal(h.kkal, 2570, 'vazn olish, usul berilmasa — o\'rtacha (+550)');
  assert.equal(h.profil.usul, 'ortacha');
  assert.equal(h.tavsiya, null);
});

test('Usul va prognoz: 3 oyda qancha kg, xavfsiz chegara, saqlashda usul yo\'q', async () => {
  const env = await makeEnv();
  // erkak, 22 yosh, 182 sm, 150 kg, ofis, ozish tez: sarf 3039 − 825 → 2210 kkal, haftasiga −0,75 kg
  let h = await env.ok(env.IDS.clientA, 'healthSave', {
    jins: 'erkak', tugilgan_yil: 2004, boy: 182, vazn: 150, maqsad: 'ozish', usul: 'tez', faollik: 'ofis'
  });
  assert.equal(h.kkal, 2210);
  assert.equal(h.reja.hafta_kg, -0.75);
  assert.equal(h.reja.chegaralandi, false);
  assert.equal(h.maqsad_nomi, 'Ozmoqchiman (tez)');
  const m3 = h.prognoz.oylar.find((x) => x.oy === 3);
  assert.equal(m3.sana, '2027-01-13');
  assert.equal(m3.vazn, 140.1); // 150 − 0,75 × 92/7
  assert.equal(h.prognoz.nuqtalar[0].vazn, 150);
  assert.equal(h.prognoz.nuqtalar.at(-1).sana, '2027-04-13');
  assert.equal(h.usullar.ozish.length, 3);
  assert.match(h.usullar.ozish[1].label, /0,5 kg/);

  // vazn olish
  h = await env.ok(env.IDS.clientA, 'healthSave', { maqsad: 'vazn_olish', usul: 'yengil', vazn: 60 });
  assert.equal(h.reja.hafta_kg, 0.25);
  assert.ok(h.prognoz.oylar.find((x) => x.oy === 3).vazn > 63);

  // saqlash: usul yo'q, prognoz yo'q
  h = await env.ok(env.IDS.clientA, 'healthSave', { maqsad: 'saqlash' });
  assert.equal(h.profil.usul, '');
  assert.equal(h.prognoz, null);
  assert.equal(h.reja.hafta_kg, 0);

  // ayol, 160 sm, 50 kg, ozish tez: 566 kkal chiqadi → 1200 dan kam emas, sur'at kamayadi, BMI 18,5 dan pastga tushmaydi
  h = await env.ok(env.IDS.clientB, 'healthSave', {
    jins: 'ayol', tugilgan_yil: 1990, boy: 160, vazn: 50, maqsad: 'ozish', usul: 'tez', faollik: 'ofis'
  });
  assert.equal(h.kkal, 1200);
  assert.equal(h.reja.chegaralandi, true);
  assert.equal(h.reja.hafta_kg, -0.17);
  assert.match(h.ogohlantirish, /1200 kkal/);
  assert.equal(h.prognoz.chegara_vazn, 47.4);
  assert.ok(h.prognoz.nuqtalar.every((x) => x.vazn >= 47.4));
  // juda past vazn — ozish tavsiya qilinmaydi
  h = await env.ok(env.IDS.clientB, 'healthSave', { vazn: 45 });
  assert.match(h.ogohlantirish, /Ozish tavsiya qilinmaydi/);

  // admin kartasida usul ko'rinadi
  const st = await env.ok(env.IDS.operator, 'weightStats');
  assert.ok(st.items.some((x) => x.maqsad === 'Ozmoqchiman (tez)'));
});
