'use strict';
/** TZ 5–11-bo'limlardagi biznes qoidalar. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeEnv, placePaidOrder, PNG } = require('./helpers');

const clientId = (env, tg) => env.gas.rows('Mijozlar').find((c) => c.tg_id === tg).id;
const msgsTo = (env, tg) => env.gas.sent.filter((m) => m.payload && m.payload.chat_id === String(tg)).map((m) => m.payload.text);

test('5.5 Bekor qilish: boshlanishdan oldin to\'liq qaytariladi', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 12);
  const pv = env.ok(env.IDS.partner, 'orderCancelPreview', { id: o.id });
  assert.equal(pv.ishlatilgan_kunlar, 0);
  assert.equal(pv.qaytariladigan_pul, 1368000);
  const res = env.ok(env.IDS.partner, 'orderCancel', { id: o.id, sabab: 'mijoz so\'radi' });
  assert.equal(res.buyurtma.holat, 'bekor');
  assert.equal(res.keshbek_olib_qolinadi, 41040);
  assert.equal(env.ok(env.IDS.clientA, 'cashback').balans, 0);
  assert.equal(env.gas.rows('Yetkazishlar').filter((d) => d.holat === 'rejada').length, 0);
});

test('5.5 Bekor qilish: 24 kunlik olib 6 kunda to\'xtatsa — 6 kunlik narx bo\'yicha qayta hisob', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 24);
  assert.equal(o.tolanadi, 2592000);
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20']) {
    env.gas.setTashkent(d, '11:00');
    env.ok(env.IDS.courier, 'courierToday').guruhlar.flatMap((g) => g.items)
      .forEach((c) => env.ok(env.IDS.courier, 'courierDelivered', { id: c.id }));
  }
  env.gas.setTashkent('2026-10-20', '12:00'); // ertangi kun hali o'zgaradi
  const pv = env.ok(env.IDS.partner, 'orderCancelPreview', { id: o.id });
  assert.equal(pv.ishlatilgan_kunlar, 6);
  assert.equal(pv.qayta_chegirma_foiz, 0); // 6 kunlik paket chegirmasi
  assert.equal(pv.ushlab_qolinadi, 720000);
  assert.equal(pv.qaytariladigan_pul, 2592000 - 720000);
  assert.equal(pv.bekor_kunlar, 18);
  // keshbek: 77 760 hisoblangan, 3% × 720 000 = 21 600 qolishi kerak
  assert.equal(pv.keshbek_olib_qolinadi, 77760 - 21600);
  env.ok(env.IDS.partner, 'orderCancel', { id: o.id, sabab: 'ko\'chib ketdi' });
  assert.equal(env.ok(env.IDS.clientA, 'cashback').balans, 21600);
  const refund = env.gas.rows('Tolovlar').find((p) => p.holat === 'qaytarildi');
  assert.equal(refund.summa, -1872000);
  const ord = env.gas.rows('Buyurtmalar').find((x) => x.id === o.id);
  assert.equal(ord.kunlik_daromad, 120000);
});

test('5.5 Yetkazib bo\'lmadi: mijoz aybi — kun kuyadi; bizning ayb — oxiriga qo\'shiladi yoki keshbek', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 6);
  env.gas.setTashkent('2026-10-14', '11:00');
  let card = env.ok(env.IDS.courier, 'courierToday').guruhlar[0].items[0];
  env.ok(env.IDS.courier, 'courierFailed', { id: card.id, sabab: 'javob_bermadi' });
  let v = env.ok(env.IDS.operator, 'orderGet', { id: o.id });
  assert.equal(v.tugash, '2026-10-20');
  assert.equal(v.qolgan_kun, 5);

  env.gas.setTashkent('2026-10-15', '11:00');
  card = env.ok(env.IDS.courier, 'courierToday').guruhlar[0].items[0];
  env.ok(env.IDS.courier, 'courierFailed', { id: card.id, sabab: 'kech_qoldi' });
  v = env.ok(env.IDS.operator, 'orderGet', { id: o.id });
  assert.equal(v.tugash, '2026-10-21');
  assert.equal(v.qolgan_kun, 5);

  env.ok(env.IDS.partner, 'settingsSave', { qiymatlar: { bizning_xato_qoida: 'keshbek' } });
  env.gas.setTashkent('2026-10-16', '11:00');
  card = env.ok(env.IDS.courier, 'courierToday').guruhlar[0].items[0];
  const before = env.ok(env.IDS.clientA, 'cashback').balans;
  env.ok(env.IDS.courier, 'courierFailed', { id: card.id, sabab: 'notogri_ovqat' });
  assert.equal(env.ok(env.IDS.clientA, 'cashback').balans, before + 120000);
  v = env.ok(env.IDS.operator, 'orderGet', { id: o.id });
  assert.equal(v.tugash, '2026-10-21');
});

test('5.2 To\'lanmagan buyurtma 48 soatdan keyin eskiradi va joriy narx bilan qayta hisoblanadi', () => {
  const env = makeEnv();
  const form = env.ok(env.IDS.clientA, 'orderForm');
  const o = env.ok(env.IDS.clientA, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(6).id, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id
  });
  env.ok(env.IDS.partner, 'priceAdd', { ratsion_id: env.ration.id, kunlik_narx: 125000, qachondan: '2026-10-14' });
  env.gas.setTashkent('2026-10-15', '09:00'); // 47 soat — narx o'zgarmaydi
  env.gas.call('cronTick');
  assert.equal(env.ok(env.IDS.clientA, 'orderDetail', { id: o.id }).jami, 720000);
  env.gas.setTashkent('2026-10-15', '11:00'); // 49 soat
  env.gas.call('cronTick');
  const v = env.ok(env.IDS.clientA, 'orderDetail', { id: o.id });
  assert.equal(v.jami, 750000);
  assert.ok(v.boshlanish >= '2026-10-16');
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /qayta hisoblandi/.test(t)));
});

test('6.2 Buyurtma oqimi: to\'lov kutilmoqda → chek → tasdiq → faol + Telegram xabari', () => {
  const env = makeEnv();
  env.gas.clearSent();
  const form = env.ok(env.IDS.clientA, 'orderForm');
  assert.equal(form.karta.raqam, '8600 1234 5678 9012');
  const o = env.ok(env.IDS.clientA, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(12).id, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id
  });
  assert.equal(o.holat, 'tolov_kutish');
  assert.equal(env.gas.rows('Yetkazishlar').length, 0, 'to\'lovgacha yetkazish kunlari yaratilmaydi');
  // karta bilan chek majburiy
  assert.equal(env.api(env.IDS.clientA, 'submitPayment', { buyurtma_id: o.id, usul: 'karta' }).ok, false);
  env.ok(env.IDS.clientA, 'submitPayment', { buyurtma_id: o.id, usul: 'karta', chek: PNG });
  // mijoz to'lov holatini o'zi o'zgartira olmaydi
  const pay = env.gas.rows('Tolovlar')[0];
  assert.equal(env.api(env.IDS.clientA, 'paymentConfirm', { tolov_id: pay.id }).code, 'ruxsat');
  // operator chekni ko'radi
  assert.match(env.ok(env.IDS.operator, 'fileView', { tolov_id: pay.id }).data, /^data:image\/png;base64,/);
  env.ok(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });
  const v = env.ok(env.IDS.clientA, 'orderDetail', { id: o.id });
  assert.equal(v.holat, 'faol');
  assert.equal(v.kunlar_jadvali.length, 12);
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /Buyurtmangiz tasdiqlandi, birinchi yetkazish: 14-oktabr/.test(t)));
  assert.ok(msgsTo(env, env.IDS.partner).some((t) => /Yangi buyurtma/.test(t)));
  const audit = env.gas.rows('Audit').find((a) => a.amal === 'tolov_tasdiq');
  assert.equal(audit.muhim, 'tolov');
});

test('6.2 Qisman to\'lov va admin nomidan qo\'lda buyurtma', () => {
  const env = makeEnv();
  const c = env.ok(env.IDS.operator, 'clientCreate', {
    ism: 'Telefon mijoz', telefon: '90 123 45 67', manba: 'Tavsiya',
    manzil: { matn: 'Yunusobod 4', hudud: 'Yunusobod' }
  });
  const form = env.ok(env.IDS.operator, 'orderFormFor', { mijoz_id: c.id });
  const o = env.ok(env.IDS.operator, 'orderCreate', {
    mijoz_id: c.id, ratsion_id: env.ration.id, paket_id: env.pkg(6).id, boshlanish: form.eng_erta,
    manzil_id: form.manzillar[0].id, tolov: { summa: 300000, usul: 'naqd' }
  });
  assert.equal(o.kim_yaratdi, 'admin');
  let v = env.ok(env.IDS.operator, 'orderGet', { id: o.id });
  assert.equal(v.tolov_holati, 'qisman');
  assert.equal(v.holat, 'tolov_kutish');
  v = env.ok(env.IDS.operator, 'paymentAdd', { buyurtma_id: o.id, summa: 420000, usul: 'naqd' });
  assert.equal(v.tolov_holati, 'tolangan');
  assert.equal(v.holat, 'faol');
  // keshbek ikki to'lovdan: 3% × 720 000
  assert.equal(env.ok(env.IDS.operator, 'clientGet', { id: c.id }).keshbek.balans, 21600);
  // telefon takrorlansa yangi mijoz ochilmaydi
  assert.equal(env.api(env.IDS.operator, 'clientCreate', { ism: 'X', telefon: '+998901234567' }).ok, false);
});

test('11.2 Ro\'yxatdan o\'tish: telefon faqat Telegram orqali, takrorlansa akkaunt ochilmaydi, rozilik majburiy', () => {
  const env = makeEnv();
  const tg = '5000009';
  let r = env.api(tg, 'register', { ism: 'Yangi', rozilik: true, manzil: { matn: 'x', hudud: 'Chilonzor' } });
  assert.equal(r.code, 'telefon');
  // boshqa odamning kontaktini yuborsa qabul qilinmaydi
  env.gas.call('handleTelegramUpdate_', {
    update_id: 77, message: { from: { id: Number(tg) }, chat: { id: Number(tg), type: 'private' }, contact: { phone_number: '+998905550000', user_id: 123 } }
  });
  assert.equal(env.ok(tg, 'contactStatus').telefon, '');
  // Aziza ning raqami bilan — rad
  env.shareContact(tg, '+998901112233');
  r = env.api(tg, 'register', { ism: 'Soxta', rozilik: true, manzil: { matn: 'x', hudud: 'Chilonzor' } });
  assert.equal(r.ok, false);
  assert.match(r.error, /boshqa akkauntga/);
  env.shareContact(tg, '+998905550000');
  r = env.api(tg, 'register', { ism: 'Yangi', manzil: { matn: 'x', hudud: 'Chilonzor' } });
  assert.match(r.error, /rozilik/);
  // noma'lum hudud
  r = env.api(tg, 'register', { ism: 'Yangi', rozilik: true, manzil: { matn: 'x', hudud: 'Marsda' } });
  assert.match(r.error, /Hudud/);
  env.ok(tg, 'register', { ism: 'Yangi', rozilik: true, manba: 'Blogger', manzil: { matn: 'Sergeli 5', hudud: 'Sergeli', lat: 41.2, lng: 69.2 } });
  const me = env.ok(tg, 'me');
  assert.equal(me.rol, 'mijoz');
  assert.equal(me.mijoz.telefon, '+998905550000');
  assert.equal(env.api(tg, 'register', { ism: 'Yana' }).ok, false);
  // admin yaratgan mijoz telegram orqali kirsa — o'sha akkauntga bog'lanadi
  env.ok(env.IDS.operator, 'clientCreate', { ism: 'Oldindan', telefon: '+998935551122' });
  env.shareContact('5000010', '+998935551122');
  env.ok('5000010', 'register', { ism: 'Oldindan', rozilik: true, manzil: { matn: 'x', hudud: 'Chilonzor' } });
  assert.equal(env.gas.rows('Mijozlar').filter((c) => c.telefon === '+998935551122').length, 1);
});

test('6.4 Telefon o\'zgartirish faqat admin orqali', () => {
  const env = makeEnv();
  assert.equal(env.api(env.IDS.clientA, 'profileUpdate', { telefon: '+998901110000' }).ok, true);
  assert.equal(env.ok(env.IDS.clientA, 'profile').telefon, '+998901112233');
  env.ok(env.IDS.clientA, 'requestPhoneChange', { telefon: '+998901110000' });
  const cid = clientId(env, env.IDS.clientA);
  env.ok(env.IDS.operator, 'phoneChange', { id: cid, tasdiq: true });
  assert.equal(env.ok(env.IDS.clientA, 'profile').telefon, '+998901110000');
});

test('9.4 Katta xarajatni ikkinchi sherik tasdiqlaydi; tahrir Auditda qoladi; operatorga yopiq', () => {
  const env = makeEnv();
  const ex = env.ok(env.IDS.partner, 'expenses', {});
  const bozor = ex.turkumlar.find((c) => c.kod === 'bozorlik');
  const big = env.ok(env.IDS.partner, 'expenseAdd', { summa: 6000000, turkum_id: bozor.id });
  assert.equal(big.holat, 'tasdiq_kutilmoqda');
  assert.equal(env.api(env.IDS.partner, 'expenseApprove', { id: big.id }).ok, false, 'o\'zi tasdiqlay olmaydi');
  assert.equal(env.ok(env.IDS.partner2, 'expenseApprove', { id: big.id }).holat, 'tasdiqlandi');
  const small = env.ok(env.IDS.partner, 'expenseAdd', { summa: 150000, turkum_id: bozor.id, izoh: 'piyoz' });
  assert.equal(small.holat, 'tasdiqlandi');
  assert.equal(small.kim_kiritdi.split(':')[0], env.partnerUser.id);
  env.ok(env.IDS.partner, 'expenseUpdate', { id: small.id, summa: 170000 });
  const a = env.gas.rows('Audit').find((x) => x.yozuv_id === small.id && x.amal === 'xarajat_tahrir');
  assert.equal(JSON.parse(a.eski).summa, 150000);
  assert.equal(JSON.parse(a.yangi).summa, 170000);
  assert.equal(env.api(env.IDS.operator, 'expenseAdd', { summa: 1, turkum_id: bozor.id }).code, 'ruxsat');
  assert.equal(env.api(env.IDS.partner, 'expenseAdd', { summa: -5, turkum_id: bozor.id }).ok, false);
  assert.equal(env.api(env.IDS.partner, 'expenseAdd', { summa: 999999999999, turkum_id: bozor.id }).ok, false);
});

test('9.3 Oyliklar: uch tur, avans, "To\'landi" xarajatga bir marta yoziladi', () => {
  const env = makeEnv();
  const cook = env.ok(env.IDS.partner, 'staffSave', { ism: 'Oshpaz Lola', lavozim: 'Oshpaz', oylik_turi: 'qatiy', summa: 4000000 });
  const helper = env.ok(env.IDS.partner, 'staffSave', { ism: 'Yordamchi', lavozim: 'Yordamchi', oylik_turi: 'kunlik', summa: 100000 });
  const kur = env.ok(env.IDS.partner, 'staffSave', { ism: 'Kuryer Ali', lavozim: 'Kuryer', oylik_turi: 'yetkazish', summa: 15000, tg_id: env.IDS.courier });
  placePaidOrder(env, env.IDS.clientA, 6);
  for (const d of ['2026-10-14', '2026-10-15']) {
    env.gas.setTashkent(d, '11:00');
    env.ok(env.IDS.courier, 'courierToday').guruhlar.flatMap((g) => g.items).forEach((c) => env.ok(env.IDS.courier, 'courierDelivered', { id: c.id }));
  }
  env.ok(env.IDS.partner, 'salaryAdvance', { xodim_id: cook.id, oy: '2026-10', summa: 1000000 });
  env.ok(env.IDS.partner, 'salaryDays', { xodim_id: helper.id, oy: '2026-10', ishlagan_kun: 20 });
  const pr = env.ok(env.IDS.partner, 'payroll', { oy: '2026-10' });
  const row = (id) => pr.items.find((x) => x.xodim_id === id);
  assert.equal(row(cook.id).hisoblangan, 4000000);
  assert.equal(row(cook.id).qolgan, 3000000);
  assert.equal(row(helper.id).hisoblangan, 2000000);
  assert.equal(row(kur.id).yetkazish_soni, 2);
  assert.equal(row(kur.id).hisoblangan, 30000);
  env.ok(env.IDS.partner, 'salaryPay', { xodim_id: cook.id, oy: '2026-10' });
  const again = env.ok(env.IDS.partner, 'salaryPay', { xodim_id: cook.id, oy: '2026-10' });
  assert.equal(again.already, true);
  const oylik = env.gas.rows('Xarajatlar').filter((x) => x.izoh.includes('Oshpaz Lola'));
  assert.equal(oylik.length, 2); // avans + qolgan
  assert.equal(oylik.reduce((s, x) => s + x.summa, 0), 4000000);
  const after = env.ok(env.IDS.partner, 'payroll', { oy: '2026-10' }).items.find((x) => x.xodim_id === cook.id);
  assert.equal(after.qolgan, 0);
});

test('6.3 Avtomatik xabarlar: ertalab, paket tugashiga 2 kun, keshbek tugashiga 7 kun, yo\'ldaman/yetkazildi', () => {
  const env = makeEnv();
  const o = placePaidOrder(env, env.IDS.clientA, 6);
  env.gas.clearSent();
  env.gas.setTashkent('2026-10-14', '08:05');
  env.gas.call('cronTick');
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /Bugun ovqatingiz yo'lda/.test(t)));
  env.gas.setTashkent('2026-10-14', '09:00');
  const card = env.ok(env.IDS.courier, 'courierToday').guruhlar[0].items[0];
  env.ok(env.IDS.courier, 'courierOnTheWay', { id: card.id });
  env.ok(env.IDS.courier, 'courierDelivered', { id: card.id });
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /Kuryer yo'lda/.test(t)));
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /^✅ Yetkazildi/.test(t)));
  // yetkazilgan karta ro'yxat oxiriga tushadi
  assert.equal(env.ok(env.IDS.courier, 'courierToday').qoldi, 0);

  for (const d of ['2026-10-15', '2026-10-16', '2026-10-17']) {
    env.gas.setTashkent(d, '11:00');
    env.ok(env.IDS.courier, 'courierToday').guruhlar.flatMap((g) => g.items).forEach((c) => env.ok(env.IDS.courier, 'courierDelivered', { id: c.id }));
  }
  env.gas.clearSent();
  env.gas.setTashkent('2026-10-17', '11:00'); // 2 kun qoldi
  env.gas.call('cronTick');
  const rem = msgsTo(env, env.IDS.clientA).filter((t) => /Davom etasizmi/.test(t));
  assert.equal(rem.length, 1);
  const withBtn = env.gas.sent.find((m) => /Davom etasizmi/.test(m.payload.text));
  assert.ok(withBtn.payload.reply_markup.inline_keyboard[0][0].web_app.url);
  env.gas.setTashkent('2026-10-19', '11:00');
  env.gas.clearSent();
  env.gas.call('cronTick');
  assert.equal(msgsTo(env, env.IDS.clientA).filter((t) => /Davom etasizmi/.test(t)).length, 0, 'bir marta yuboriladi');

  // keshbek 13-okt + 60 = 12-dekabr; 7 kun oldin = 5-dekabr
  env.gas.clearSent();
  env.gas.setTashkent('2026-12-05', '10:30');
  env.gas.call('cronTick');
  assert.ok(msgsTo(env, env.IDS.clientA).some((t) => /21 600 so'm keshbekingiz muddati/.test(t)));
  assert.ok(o);
});

test('7 Mijoz holatlari avtomatik: yangi → faol → uxlayotgan → ketgan', () => {
  const env = makeEnv();
  const cid = clientId(env, env.IDS.clientA);
  const st = () => env.gas.rows('Mijozlar').find((c) => c.id === cid).holat;
  assert.equal(st(), 'yangi');
  placePaidOrder(env, env.IDS.clientA, 6);
  assert.equal(st(), 'faol');
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20']) {
    env.gas.setTashkent(d, '11:00');
    env.ok(env.IDS.courier, 'courierToday').guruhlar.flatMap((g) => g.items).forEach((c) => env.ok(env.IDS.courier, 'courierDelivered', { id: c.id }));
  }
  assert.equal(env.gas.rows('Buyurtmalar')[0].holat, 'tugadi');
  env.gas.setTashkent('2026-10-25', '00:30');
  env.gas.call('cronTick');
  assert.equal(st(), 'uxlayotgan');
  env.gas.setTashkent('2026-12-10', '00:30');
  env.gas.call('cronTick');
  assert.equal(st(), 'ketgan');
});

test('8.2 Kuryer hudud bo\'yicha biriktiriladi va keyingi kunlarda o\'zi takrorlanadi', () => {
  const env = makeEnv();
  env.ok(env.IDS.partner, 'userSave', { tg_id: '3000002', rol: 'kuryer', ism: 'Kuryer Vali' });
  const o = placePaidOrder(env, env.IDS.clientB, 6); // Yunusobod — 2 kuryer, avtomatik biriktirilmaydi
  let board = env.ok(env.IDS.operator, 'deliveryBoard', { sana: '2026-10-14' });
  assert.equal(board.biriktirilmagan, 1);
  const vali = board.kuryerlar.find((k) => k.ism === 'Kuryer Vali');
  env.ok(env.IDS.operator, 'assignCourier', { hudud: 'Yunusobod', sana: '2026-10-14', kuryer_id: vali.id, eslab_qol: true });
  board = env.ok(env.IDS.operator, 'deliveryBoard', { sana: '2026-10-16' });
  assert.equal(board.biriktirilmagan, 0);
  assert.equal(board.guruhlar[0].items[0].kuryer, 'Kuryer Vali');
  // yangi buyurtma ham shu kuryerga tushadi
  env.gas.setTashkent('2026-10-14', '10:00');
  placePaidOrder(env, env.IDS.clientB, 6);
  const ds = env.gas.rows('Yetkazishlar').filter((d) => d.hudud === 'Yunusobod');
  assert.ok(ds.every((d) => d.kuryer_id === vali.id));
  const k = env.ok(env.IDS.operator, 'kitchen', { sana: '2026-10-16' });
  assert.equal(k.jami, 2);
  assert.equal(k.ratsionlar[0].soni, 2);
  assert.ok(o);
});

test('8.4 Kun oxirida belgilanmagan yetkazishlar admin "Bugun" ekranida', () => {
  const env = makeEnv();
  placePaidOrder(env, env.IDS.clientA, 6);
  env.gas.setTashkent('2026-10-14', '15:00');
  assert.equal(env.ok(env.IDS.operator, 'adminToday').belgilanmagan.length, 0);
  env.gas.setTashkent('2026-10-14', '21:30');
  const t = env.ok(env.IDS.operator, 'adminToday');
  assert.equal(t.belgilanmagan.length, 1);
  assert.equal(t.bugun.jami, 1);
});

test('11.3 Audit: keshbek tuzatish izohsiz bo\'lmaydi va alohida belgilanadi; 11.5 anonimlashtirish', () => {
  const env = makeEnv();
  const cid = clientId(env, env.IDS.clientA);
  assert.equal(env.api(env.IDS.operator, 'cashbackAdjust', { mijoz_id: cid, summa: 5000 }).ok, false);
  env.ok(env.IDS.operator, 'cashbackAdjust', { mijoz_id: cid, summa: 5000, izoh: 'shikoyat uchun' });
  const a = env.gas.rows('Audit').filter((x) => x.muhim === 'keshbek_tuzatish');
  assert.equal(a.length, 1);
  const audit = env.ok(env.IDS.partner, 'audit', { muhim: true });
  assert.ok(audit.items.length >= 1);
  // anonimlashtirish
  env.ok(env.IDS.partner, 'clientAnonymize', { id: cid });
  const c = env.gas.rows('Mijozlar').find((x) => x.id === cid);
  assert.equal(c.telefon, '');
  assert.match(c.ism, /^Anonim/);
  assert.equal(env.gas.rows('KeshbekHarakat').filter((e) => e.mijoz_id === cid).length, 1, 'pul yozuvlari qoladi');
  assert.equal(env.api(env.IDS.clientA, 'home').ok, false);
});

test('11.2 So\'rovlar soni cheklanadi; webhook maxfiy kalitsiz qabul qilinmaydi', () => {
  const env = makeEnv();
  env.ok(env.IDS.partner, 'settingsSave', { qiymatlar: { rate_limit_daqiqa: '5' } });
  let last;
  for (let i = 0; i < 7; i++) last = env.api(env.IDS.clientA, 'home');
  assert.equal(last.code, 'limit');
  env.gas.props.set('WEBHOOK_SECRET', 's3cret');
  const before = env.gas.sent.length;
  const out = env.gas.call('doPost', { parameter: { tg: 'wrong' }, postData: { contents: JSON.stringify({ update_id: 1, message: { from: { id: 1 }, chat: { id: 1, type: 'private' }, text: '/start' } }) } });
  assert.equal(JSON.parse(out.getContent()).ok, false);
  assert.equal(env.gas.sent.length, before);
  env.gas.call('doPost', { parameter: { tg: 's3cret' }, postData: { contents: JSON.stringify({ update_id: 2, message: { from: { id: 1 }, chat: { id: 1, type: 'private' }, text: '/start' } }) } });
  assert.ok(env.gas.sent.length > before);
});

test('8.1 Zaxira: Telegram "joylashuvni yuborish" va botga chek rasmi', () => {
  const env = makeEnv();
  env.gas.call('handleTelegramUpdate_', { update_id: 501, message: { from: { id: Number(env.IDS.clientA) }, chat: { id: 1, type: 'private' }, location: { latitude: 41.33, longitude: 69.3 } } });
  assert.equal(env.ok(env.IDS.clientA, 'sharedLocation').lat, 41.33);
  const form = env.ok(env.IDS.clientA, 'orderForm');
  const o = env.ok(env.IDS.clientA, 'createOrder', { ratsion_id: env.ration.id, paket_id: env.pkg(6).id, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id });
  env.gas.call('dbReset_');
  env.gas.call('handleTelegramUpdate_', { update_id: 502, message: { from: { id: Number(env.IDS.clientA) }, chat: { id: 1, type: 'private' }, photo: [{ file_id: 'a' }, { file_id: 'b' }] } });
  const pay = env.gas.rows('Tolovlar').find((p) => p.buyurtma_id === o.id);
  assert.equal(pay.holat, 'kutilmoqda');
  assert.ok(pay.chek_rasm);
});

test('11.4 Tungi zaxira: nusxa olinadi, 30 kundan eskisi o\'chadi, oyning 1-kuni arxivga', () => {
  const env = makeEnv();
  env.gas.setTashkent('2026-11-01', '00:10');
  env.gas.call('cronTick');
  const names = [...env.gas.folders.values()].map((f) => [f.name, f.list.length]);
  assert.ok(names.some(([n, c]) => /zaxira/.test(n) && c === 1));
  assert.ok(names.some(([n, c]) => /arxiv/.test(n) && c === 1));
});
