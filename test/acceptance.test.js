'use strict';
/**
 * TZ 12-bo'lim: qabul mezonlari. Har bir test aniq natija beradi: o'tdi yoki o'tmadi.
 * Ishga tushirish: npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeEnv, placePaidOrder, PNG } = require('./helpers');
const { signInitData } = require('./gas-mock');

test('1. Narx/chegirma o\'zgarsa eski buyurtma summasi o\'zgarmaydi; yangi qiymat faqat "qachondan" dan keyin', () => {
  const env = makeEnv();
  const old = placePaidOrder(env, env.IDS.clientA, 12);
  assert.equal(old.jami, 1368000);

  // ertadan boshlab yangi narx va yangi chegirma
  env.ok(env.IDS.partner, 'priceAdd', { ratsion_id: env.ration.id, kunlik_narx: 130000, qachondan: '2026-10-14' });
  env.ok(env.IDS.partner, 'packageAdd', { kunlar: 12, chegirma_foiz: 7, qachondan: '2026-10-14', nom: '12 kunlik' });

  // bugun hali eski narx
  let q = env.ok(env.IDS.clientB, 'quote', { ratsion_id: env.ration.id, paket_id: env.pkg(12).id });
  assert.equal(q.kunlik_narx, 120000);
  assert.equal(q.jami, 1368000);

  // ertaga yangi narx
  env.gas.setTashkent('2026-10-14', '09:00');
  q = env.ok(env.IDS.clientB, 'quote', { ratsion_id: env.ration.id, paket_id: env.pkg(12).id });
  assert.equal(q.kunlik_narx, 130000);
  assert.equal(q.chegirma_foiz, 7);
  assert.equal(q.jami, Math.round(12 * 130000 * 0.93));

  const after = env.ok(env.IDS.operator, 'orderGet', { id: old.id });
  assert.equal(after.jami, 1368000);
  assert.equal(after.kunlik_narx, 120000);
  assert.equal(after.chegirma_foiz, 5);
  // eski narx qatori o'chmagan
  assert.equal(env.gas.rows('Narxlar').length, 2);
});

test('2. 6 kunlik buyurtma yakshanbani o\'tkazadi, aynan 6 yetkazish; tugashdan keyin "Bugun" ro\'yxatida yo\'q', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 6);
  const days = o.kunlar_jadvali.map((k) => k.sana);
  assert.equal(days.length, 6);
  assert.deepEqual(days, ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20']);
  assert.ok(!days.includes('2026-10-18'), 'yakshanba o\'tkazilishi kerak');
  assert.equal(o.tugash, '2026-10-20');
  assert.equal(env.gas.rows('Yetkazishlar').filter((d) => d.buyurtma_id === o.id).length, 6);

  env.gas.setTashkent('2026-10-20', '09:00');
  assert.equal(env.ok(env.IDS.courier, 'courierToday').jami, 1);
  env.gas.setTashkent('2026-10-21', '09:00');
  const board = env.ok(env.IDS.operator, 'deliveryBoard', {});
  assert.equal(board.jami, 0);
  assert.equal(env.ok(env.IDS.courier, 'courierToday').jami, 0);
});

test('2b. Bayram kunlari ham o\'tkaziladi; kesish vaqtidan keyin eng erta sana — indinga', () => {
  const env = makeEnv();
  env.ok(env.IDS.partner, 'settingsSave', { qiymatlar: { bayramlar: '["2026-10-15"]' } });
  env.gas.setTashkent('2026-10-13', '18:30');
  const form = env.ok(env.IDS.clientA, 'orderForm');
  assert.equal(form.eng_erta, '2026-10-16'); // 14 — kesishdan keyin yo'q, 15 — bayram
  const o = placePaidOrder(env, env.IDS.clientA, 6);
  assert.deepEqual(o.kunlar_jadvali.map((k) => k.sana), ['2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']);
  // eng erta sanadan oldingi kunni tanlab bo'lmaydi
  const r = env.api(env.IDS.clientB, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(6).id, boshlanish: '2026-10-14',
    manzil_id: env.ok(env.IDS.clientB, 'orderForm').manzillar[0].id
  });
  assert.equal(r.ok, false);
});

test('3. Pauza paket oxirini bir kunga suradi va chegaradan oshirishga yo\'l qo\'ymaydi', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 12); // 20% → 2 kun pauza
  assert.equal(o.pauza_limit, 2);
  const endBefore = o.tugash;
  const day = o.kunlar_jadvali.find((k) => k.sana === '2026-10-16');
  let v = env.ok(env.IDS.clientA, 'pauseDay', { buyurtma_id: o.id, yetkazish_id: day.id });
  assert.equal(v.tugash > endBefore, true);
  assert.equal(v.qolgan_kun, 12); // pauza kuni rejadan chiqdi, oxiriga yangi kun qo'shildi
  assert.equal(v.kunlar_jadvali.filter((k) => k.holat !== 'pauza').length, 12);
  // tugash 1 ish kuniga surildi (yakshanba o'tkaziladi)
  assert.equal(v.tugash, '2026-10-28');
  assert.equal(endBefore, '2026-10-27');

  const d2 = v.kunlar_jadvali.find((k) => k.sana === '2026-10-17');
  v = env.ok(env.IDS.clientA, 'pauseDay', { buyurtma_id: o.id, yetkazish_id: d2.id });
  const d3 = v.kunlar_jadvali.find((k) => k.sana === '2026-10-19');
  const r = env.api(env.IDS.clientA, 'pauseDay', { buyurtma_id: o.id, yetkazish_id: d3.id });
  assert.equal(r.ok, false);
  assert.match(r.error, /Pauza chegarasi/);

  // pauzani qaytarish — oxirgi qo'shilgan kun olib tashlanadi
  v = env.ok(env.IDS.clientA, 'unpauseDay', { buyurtma_id: o.id, yetkazish_id: d2.id });
  assert.equal(v.tugash, '2026-10-28');
  assert.equal(v.kunlar_jadvali.filter((k) => k.holat === 'rejada').length, 12);
  assert.equal(v.pauza, 1);
});

test('3b. Ertangi kunni kesish vaqtidan keyin pauza qilib bo\'lmaydi', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 12);
  const tomorrow = o.kunlar_jadvali.find((k) => k.sana === '2026-10-14');
  env.gas.setTashkent('2026-10-13', '18:01');
  const r = env.api(env.IDS.clientA, 'pauseDay', { buyurtma_id: o.id, yetkazish_id: tomorrow.id });
  assert.equal(r.ok, false);
  assert.match(r.error, /kesish vaqti/);
  env.gas.setTashkent('2026-10-13', '17:59');
  assert.ok(env.api(env.IDS.clientA, 'pauseDay', { buyurtma_id: o.id, yetkazish_id: tomorrow.id }).ok);
});

test('4. Keshbek: FIFO, muddati o\'tgani balansdan chiqadi, takror tasdiq ikki marta hisoblamaydi', () => {
  const env = makeEnv();
  // 1-lot: 13-oktabr, 21 600
  const o1 = placePaidOrder(env, env.IDS.clientA, 6);
  // takror tasdiq
  const again = env.ok(env.IDS.partner, 'paymentConfirm', { tolov_id: o1.tolov_id });
  assert.equal(again.already, true);
  let earned = env.gas.rows('KeshbekHarakat').filter((e) => e.tur === 'hisoblandi');
  assert.equal(earned.length, 1);
  assert.equal(earned[0].summa, 21600);

  // 2-lot: 30 kundan keyin, 41 040
  env.gas.setTashkent('2026-11-12', '10:00');
  placePaidOrder(env, env.IDS.clientA, 12, { use_cashback: false });
  let cb = env.ok(env.IDS.clientA, 'cashback');
  assert.equal(cb.balans, 21600 + 41040);

  // 10 000 ishlatamiz — eng eski (1-lot) dan ketadi
  env.ok(env.IDS.partner, 'cashbackAdjust', { mijoz_id: env.ok(env.IDS.clientA, 'me') && env.gas.rows('Mijozlar').find((c) => c.tg_id === env.IDS.clientA).id, summa: -10000, izoh: 'FIFO sinovi' });
  cb = env.ok(env.IDS.clientA, 'cashback');
  assert.equal(cb.balans, 52640);

  // 1-lot muddati 2026-12-12 da tugaydi (60 kun). Undan keyin uning qoldig'i (11 600) yo'qoladi.
  env.gas.setTashkent('2026-12-13', '10:00');
  cb = env.ok(env.IDS.clientA, 'cashback');
  assert.equal(cb.balans, 41040, 'eski lot qoldig\'i chiqib ketishi kerak, yangisi to\'liq qolishi kerak');
  // tungi job muddati o'tganini yozib qo'yadi
  env.gas.setTashkent('2026-12-13', '00:10');
  env.gas.call('cronTick');
  const expired = env.gas.rows('KeshbekHarakat').filter((e) => e.tur === 'muddati_otdi');
  assert.equal(expired.length, 1);
  assert.equal(expired[0].summa, -11600);
  env.gas.setTashkent('2026-12-13', '10:00');
  assert.equal(env.ok(env.IDS.clientA, 'cashback').balans, 41040);
});

test('4b. Keshbek bilan to\'lash chegarasi (30%) va keshbekdan keshbek yo\'q', () => {
  const env = makeEnv();
  const cid = env.gas.rows('Mijozlar').find((c) => c.tg_id === env.IDS.clientA).id;
  env.ok(env.IDS.partner, 'cashbackAdjust', { mijoz_id: cid, summa: 500000, izoh: 'sovg\'a' });
  const q = env.ok(env.IDS.clientA, 'quote', { ratsion_id: env.ration.id, paket_id: env.pkg(6).id, use_cashback: true });
  assert.equal(q.keshbek_ishlatildi, 216000); // 720 000 × 30%
  assert.equal(q.tolanadi, 504000);
  assert.equal(q.yangi_keshbek, Math.round(0.03 * 504000));
  const o = placePaidOrder(env, env.IDS.clientA, 6, { use_cashback: true });
  assert.equal(o.tolanadi, 504000);
  const cb = env.ok(env.IDS.clientA, 'cashback');
  assert.equal(cb.balans, 500000 - 216000 + 15120);
});

test('5. Tannarxdan past narx kiritilsa marja qo\'riqchisi ogohlantiradi', () => {
  const env = makeEnv();
  const r = env.api(env.IDS.partner, 'priceAdd', { ratsion_id: env.ration.id, kunlik_narx: 70000 });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'marja');
  assert.ok(r.data.ogohlantirishlar.length > 0);
  // 24 kunlik: 70 000 × 0.9 × 0.97 = 61 110 < 66 800
  assert.ok(r.data.ogohlantirishlar.some((w) => w.kunlar === 24));
  assert.equal(env.gas.rows('Narxlar').length, 1, 'tasdiqsiz saqlanmasligi kerak');
  // ongli tasdiq bilan saqlanadi
  assert.ok(env.api(env.IDS.partner, 'priceAdd', { ratsion_id: env.ration.id, kunlik_narx: 70000, tasdiq: true }).ok);
  // chegirma oshirilganda ham tekshiradi
  const r2 = env.api(env.IDS.partner, 'packageAdd', { kunlar: 24, chegirma_foiz: 50 });
  assert.equal(r2.code, 'marja');
  // keshbek oshirilganda ham
  const r3 = env.api(env.IDS.partner, 'cashbackRuleAdd', { foiz: 60, amal_muddati_kun: 60, max_ulush_foiz: 30 });
  assert.equal(r3.code, 'marja');
});

test('6. Mijoz boshqa mijozning id sini yuborib, uning ma\'lumotini ola olmaydi', () => {
  const env = makeEnv();
  const oA = placePaidOrder(env, env.IDS.clientA, 6);
  const addrA = env.ok(env.IDS.clientA, 'addresses').items[0];
  const B = env.IDS.clientB;
  const tries = [
    ['orderDetail', { id: oA.id }],
    ['pauseDay', { buyurtma_id: oA.id, yetkazish_id: oA.kunlar_jadvali[2].id }],
    ['submitPayment', { buyurtma_id: oA.id, usul: 'naqd' }],
    ['cancelMyOrder', { buyurtma_id: oA.id }],
    ['addressSave', { id: addrA.id, matn: 'buzildi', hudud: 'Chilonzor' }],
    ['addressRemove', { id: addrA.id }],
    ['changeOrderAddress', { buyurtma_id: oA.id, manzil_id: addrA.id }]
  ];
  tries.forEach(([action, p]) => {
    const r = env.api(B, action, p);
    assert.equal(r.ok, false, action + ' rad etilishi kerak');
    assert.ok(!JSON.stringify(r).includes('Aziza'), action + ': A ning ismi chiqmasligi kerak');
  });
  // mijoz o'z ro'yxatida faqat o'zinikini ko'radi
  assert.equal(env.ok(B, 'myOrders').length, 0);
  // admin amallari mijozga yopiq
  ['adminToday', 'ordersList', 'clientsSearch', 'clientGet', 'dashboard', 'expenses'].forEach((a) => {
    assert.equal(env.api(B, a, { id: 'x' }).code, 'ruxsat', a);
  });
  // A ning manzili o'zgarmagan
  assert.equal(env.ok(env.IDS.clientA, 'addresses').items[0].matn, addrA.matn);
});

test('7. Soxta yoki eskirgan Telegram imzosi rad etiladi', () => {
  const env = makeEnv();
  const now = Math.floor(env.gas.ctx.__NOW__ / 1000);
  const good = signInitData(env.TOKEN, { id: Number(env.IDS.partner), first_name: 'P' }, now);
  assert.ok(env.api(null, 'me', {}, { initData: good }).ok);

  const wrongToken = signInitData('999:OTHER', { id: Number(env.IDS.partner), first_name: 'P' }, now);
  assert.equal(env.api(null, 'me', {}, { initData: wrongToken }).code, 'auth');

  // user maydonini almashtirish (imzo buziladi)
  const forged = new URLSearchParams(good);
  forged.set('user', JSON.stringify({ id: Number(env.IDS.clientA), first_name: 'X' }));
  assert.equal(env.api(null, 'me', {}, { initData: forged.toString() }).code, 'auth');

  const old = signInitData(env.TOKEN, { id: Number(env.IDS.partner), first_name: 'P' }, now - 25 * 3600);
  const r = env.api(null, 'me', {}, { initData: old });
  assert.equal(r.code, 'auth');
  assert.match(r.error, /eskirgan/);

  assert.equal(env.api(null, 'me', {}, { initData: '' }).code, 'auth');
  assert.equal(env.api(null, 'me', {}, { initData: 'user=%7B%22id%22%3A1%7D' }).code, 'auth');
});

test('8. Kuryer narx, to\'lov va boshqa mijoz tarixini ko\'rmaydi; operator xarajat va foydani ko\'rmaydi', () => {
  const env = makeEnv();
  placePaidOrder(env, env.IDS.clientA, 6);
  env.gas.setTashkent('2026-10-14', '09:00');
  const list = env.ok(env.IDS.courier, 'courierToday');
  assert.equal(list.jami, 1);
  const card = list.guruhlar[0].items[0];
  const json = JSON.stringify(list.guruhlar);
  ['narx', 'jami', 'tolanadi', 'summa', 'keshbek', 'tolov', 'chegirma'].forEach((k) => {
    assert.ok(!json.includes('"' + k), 'kuryer javobida "' + k + '" bo\'lmasligi kerak');
  });
  assert.ok(!/120000|720000/.test(json));
  assert.equal(card.ism, 'Aziza');
  assert.ok(card.telefon && card.manzil && card.moljal && card.google);

  ['orderGet', 'ordersList', 'clientGet', 'clientsSearch', 'cashback', 'adminToday', 'dashboard', 'myOrders'].forEach((a) => {
    assert.equal(env.api(env.IDS.courier, a, { id: 'x' }).ok, false, 'kuryer: ' + a);
  });
  ['expenses', 'expenseAdd', 'dashboard', 'payroll', 'salaryPay', 'pricing', 'priceAdd', 'settings', 'audit', 'users', 'userSave'].forEach((a) => {
    assert.equal(env.api(env.IDS.operator, a, {}).code, 'ruxsat', 'operator: ' + a);
  });
  // operator o'z ishini qila oladi
  assert.ok(env.api(env.IDS.operator, 'adminToday').ok);
  assert.ok(env.api(env.IDS.operator, 'ordersList').ok);
  // kuryer boshqa kuryerning yetkazishini belgilay olmaydi
  env.ok(env.IDS.partner, 'userSave', { tg_id: '3000002', rol: 'kuryer', ism: 'Kuryer 2' });
  assert.equal(env.api('3000002', 'courierDelivered', { id: card.id }).ok, false);
});

test('9. Bir vaqtda yozish: har bir yozuv qulf ichida, keshbek ikki buyurtmada ikki marta sarflanmaydi', () => {
  const env = makeEnv();
  const cid = env.gas.rows('Mijozlar').find((c) => c.tg_id === env.IDS.clientA).id;
  env.ok(env.IDS.partner, 'cashbackAdjust', { mijoz_id: cid, summa: 250000, izoh: 'sinov' });
  const before = env.gas.lockStats.acquired;
  const form = env.ok(env.IDS.clientA, 'orderForm');
  const mk = () => env.api(env.IDS.clientA, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(6).id, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id, use_cashback: true
  });
  const a = mk(), b = mk();
  assert.ok(a.ok && b.ok);
  assert.equal(env.gas.lockStats.acquired - before, 2);
  assert.equal(a.data.keshbek_ishlatildi, 216000);
  assert.equal(b.data.keshbek_ishlatildi, 34000, 'ikkinchi buyurtma faqat qolgan balansni oladi');
  assert.equal(env.ok(env.IDS.clientA, 'cashback').balans, 0);
  // ikki xodim bir to'lovni tasdiqlasa — bitta keshbek
  env.ok(env.IDS.clientA, 'submitPayment', { buyurtma_id: a.data.id, usul: 'naqd' });
  const pay = env.gas.rows('Tolovlar').find((p) => p.buyurtma_id === a.data.id);
  const r1 = env.api(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });
  const r2 = env.api(env.IDS.partner, 'paymentConfirm', { tolov_id: pay.id });
  assert.ok(r1.ok && r2.ok && r2.data.already);
  assert.equal(env.gas.rows('KeshbekHarakat').filter((e) => e.tur === 'hisoblandi').length, 1);
  assert.equal(env.gas.rows('Yetkazishlar').filter((d) => d.buyurtma_id === a.data.id).length, 6);
  assert.equal(env.gas.lockStats.held, false);
});

test('10. Dashboard daromad va foydasi qo\'lda hisoblangan haftalik namuna bilan mos', () => {
  const env = makeEnv();
  // 12 kunlik: 1 368 000, kuniga 114 000. 6 kunlik: 720 000, kuniga 120 000
  const o12 = placePaidOrder(env, env.IDS.clientA, 12);
  const o6 = placePaidOrder(env, env.IDS.clientB, 6);

  // 14..20 oktabr: kuryer yetkazadi; A — 17-oktabrda uyda yo'q (kun kuyadi)
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20']) {
    env.gas.setTashkent(d, '11:00');
    const list = env.ok(env.IDS.courier, 'courierToday');
    list.guruhlar.flatMap((g) => g.items).forEach((c) => {
      if (d === '2026-10-17' && c.ism === 'Aziza') env.ok(env.IDS.courier, 'courierFailed', { id: c.id, sabab: 'javob_bermadi' });
      else env.ok(env.IDS.courier, 'courierDelivered', { id: c.id });
    });
  }
  env.gas.setTashkent('2026-10-20', '20:00');
  const cat = (kod) => env.ok(env.IDS.partner, 'expenses', {}).turkumlar.find((c) => c.kod === kod);
  env.ok(env.IDS.partner, 'expenseAdd', { summa: 300000, turkum_id: cat('bozorlik').id, sana: '2026-10-14', izoh: 'bozor' });
  env.ok(env.IDS.partner, 'expenseAdd', { summa: 150000, turkum_id: cat('qadoq').id, sana: '2026-10-16' });
  env.ok(env.IDS.partner, 'expenseAdd', { summa: 3100000, turkum_id: cat('ijara').id, sana: '2026-10-01' }); // 100 000 / kun
  env.ok(env.IDS.partner, 'expenseAdd', { summa: 1000000, turkum_id: cat('sherik').id, sana: '2026-10-17', sherik_id: 'Sherik 1' });
  const dash = env.ok(env.IDS.partner, 'dashboard', { davr: 'custom', dan: '2026-10-14', gacha: '2026-10-20' });
  // qo'lda: A — 6 kun (5 yetkazildi + 1 kuygan) × 114 000 = 684 000; B — 6 × 120 000 = 720 000
  assert.equal(dash.asosiy.yetkazilgan, 11);
  assert.equal(dash.asosiy.daromad, 684000 + 720000);
  // xarajat: 300 000 + 150 000 + 7 kun × 100 000 = 1 150 000 (sherik taqsimoti kirmaydi)
  assert.equal(dash.asosiy.xarajat, 1150000);
  assert.equal(dash.asosiy.foyda, 1404000 - 1150000);
  assert.equal(dash.asosiy.marja, Math.round((254000 / 1404000) * 10000) / 100);
  // kassa: tushum 1 368 000 + 720 000 − xarajat (300 000+150 000+3 100 000) − sherik 1 000 000
  assert.equal(dash.asosiy.kassa, 2088000 - 3550000 - 1000000);
  // hali yetkazilmagan: A da 6 kun × 114 000
  assert.equal(dash.asosiy.oldindan_olingan, 6 * 114000);
  assert.equal(dash.asosiy.keshbek_majburiyati, 41040 + 21600);
  assert.equal(dash.asosiy.ish_kunlari, 6);
  assert.equal(dash.asosiy.ortacha_kunlik, Math.round(11 / 6 * 100) / 100);
  // sheriklar ulushi: foyda × foiz, olingan pul ayriladi
  const s1 = dash.sheriklar.find((s) => s.ism === 'Sherik 1');
  assert.equal(s1.ulush, Math.round(254000 * 0.25));
  assert.equal(s1.olingan, 1000000);
  assert.equal(dash.mijozlar.tolovchi, 2);
  assert.ok(dash.grafik.kunlik.length === 7);
  assert.ok(o12 && o6);
});

test('11. 100 mijoz va 300 buyurtma bilan asosiy ekranlar tez ochiladi', () => {
  const env = makeEnv({ clients: false });
  env.gas.props.set('ALLOW_TEST_SEED', 'ha');
  env.gas.call('seedTestData');
  const someClient = env.gas.rows('Mijozlar')[5];
  const screens = [
    [env.IDS.partner, 'adminToday'], [env.IDS.partner, 'ordersList'], [env.IDS.partner, 'dashboard'],
    [env.IDS.partner, 'clientsSearch'], [env.IDS.operator, 'deliveryBoard'], [someClient.tg_id, 'home'],
    [someClient.tg_id, 'myOrders'], [someClient.tg_id, 'cashback']
  ];
  screens.forEach(([tg, a]) => {
    const t0 = Date.now();
    const r = env.api(tg, a, {});
    const ms = Date.now() - t0;
    assert.ok(r.ok, a + ': ' + r.error);
    assert.ok(ms < 3000, a + ' ' + ms + ' ms');
  });
});

test('12. Kesish vaqtida ertangi ro\'yxat Telegram guruhga yuboriladi (ilova ishlamasa ham)', () => {
  const env = makeEnv();
  placePaidOrder(env, env.IDS.clientA, 6);
  env.gas.clearSent();
  env.gas.setTashkent('2026-10-13', '18:05');
  env.gas.call('cronTick');
  const toGroup = env.gas.sent.filter((m) => m.payload && m.payload.chat_id === '-100555');
  assert.equal(toGroup.length, 1);
  const text = toGroup[0].payload.text;
  assert.match(text, /Aziza/);
  assert.match(text, /\+998901112233/);
  assert.match(text, /Chilonzor 9-kvartal/);
  assert.match(text, /Ozish Express/);
  // ikkinchi marta yuborilmaydi
  env.gas.clearSent();
  env.gas.setTashkent('2026-10-13', '18:20');
  env.gas.call('cronTick');
  assert.equal(env.gas.sent.filter((m) => m.payload && m.payload.chat_id === '-100555').length, 0);
});
