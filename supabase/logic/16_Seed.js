/**
 * Boshlang'ich ma'lumotlar. Jadvallar, xarajat turkumlari — migratsiyalarda (supabase/migrations).
 * Bu yerda: TZ dagi misol narxlar (ixtiyoriy) va 100 mijoz / 300 buyurtmali sinov ma'lumoti.
 */

/**
 * TZ dagi misol qiymatlar — Ozish Express, 120 000 so'm/kun,
 * paketlar 6/12/24 kun (0/5/10%), keshbek 3%, 60 kun, buyurtmaning 30% gacha.
 * Keyin hammasi admin panel orqali o'zgartiriladi.
 */
function seedExample_() {
  dbReset_();
  var t = today_();
  if (!all_('Ratsionlar').length) {
    var r = insert_('Ratsionlar', {
      nom: 'Ozish Express', kaloriya: 1200, tavsif: 'Kuniga 5 mahal, ozish uchun',
      tannarx_ovqat: 44800, tannarx_qadoq_yetkazish: 22000, faol: true
    }, 'tizim');
    insert_('Narxlar', { ratsion_id: r.id, kunlik_narx: 120000, qachondan: t, faol: true, yaratilgan: nowIso_() }, 'tizim');
  }
  if (!all_('Paketlar').length) {
    insertMany_('Paketlar', [[6, 0], [12, 5], [24, 10]].map(function (p) {
      return { nom: p[0] + ' kunlik', kunlar: p[0], chegirma_foiz: p[1], qachondan: t, faol: true, yaratilgan: nowIso_() };
    }), 'tizim');
  }
  if (!all_('KeshbekQoida').length) {
    insert_('KeshbekQoida', { foiz: 3, amal_muddati_kun: 60, min_summa: 0, max_ulush_foiz: 30, qachondan: t, yaratilgan: nowIso_() }, 'tizim');
  }
  dbFlush_();
  return 'Misol ma\'lumotlar qo\'shildi';
}

/**
 * Sinov uchun: 100 ta mijoz va 300 ta buyurtma (12-bo'lim, tezlik mezoni).
 * FAQAT sinov jadvalida ishlating!
 */
function seedTestData_() {
  dbReset_();
  if (ENV_.ALLOW_TEST_SEED !== 'ha') {
    fail('Sinov ma\'lumoti faqat ALLOW_TEST_SEED=ha bo\'lganda qo\'shiladi');
  }
  seedExample_();
  dbReset_();
  var ratsion = all_('Ratsionlar')[0];
  var pkgs = activePackages_(today_());
  var hududlar = settingJson_('hududlar', []);
  var clients = [], addrs = [];
  for (var i = 0; i < 100; i++) {
    var cid = uid_();
    clients.push({ id: cid, tg_id: String(900000000 + i), ism: 'Test mijoz ' + (i + 1), telefon: '+99890' + ('0000000' + i).slice(-7),
      manba: SOURCES[i % SOURCES.length], royxatdan_sana: addDays_(today_(), -60 + (i % 50)), holat: 'yangi', izoh: '', til: 'uz',
      rozilik_vaqt: nowIso_(), telefon_sorov: '', kim_yaratdi: 'admin', faol: true });
    addrs.push({ id: uid_(), mijoz_id: cid, nom: 'Uy', lat: 41.3 + i / 1000, lng: 69.24 + i / 1000, matn: 'Test ko\'chasi ' + i,
      moljal: '', hudud: hududlar[i % hududlar.length], faol: true });
  }
  insertMany_('Mijozlar', clients, 'tizim');
  insertMany_('Manzillar', addrs, 'tizim');
  insertMany_('Foydalanuvchilar', clients.map(function (c) {
    return { tg_id: c.tg_id, rol: ROLES.CLIENT, ism: c.ism, faol: true, yaratilgan: nowIso_() };
  }), 'tizim');
  var orders = [], dels = [];
  var off = offDays_();
  for (var j = 0; j < 300; j++) {
    var p = pkgs[j % pkgs.length];
    var start = addDays_(today_(), -40 + (j % 45));
    var dates = deliveryDates_(start, p.kunlar, off);
    var jami = money_(p.kunlar * 120000 * (1 - p.chegirma_foiz / 100));
    var oid = uid_();
    var c = clients[j % 100], a = addrs[j % 100];
    orders.push({ id: oid, mijoz_id: c.id, manzil_id: a.id, ratsion_id: ratsion.id, paket_id: p.id, kunlar: p.kunlar,
      boshlanish: dates[0], tugash: dates[dates.length - 1], kunlik_narx: 120000, chegirma_foiz: p.chegirma_foiz,
      keshbek_foiz: 3, keshbek_muddat_kun: 60, keshbek_ishlatildi: 0, jami: jami, tolanadi: jami,
      kunlik_daromad: round2_(jami / p.kunlar), tolov_holati: 'tolangan', holat: dates[dates.length - 1] < today_() ? 'tugadi' : 'faol',
      kim_yaratdi: 'admin', yaratilgan: start + 'T10:00:00', narx_muddati: '', tolov_usuli: 'karta', izoh: 'test', qaytarilgan: 0 });
    dates.forEach(function (d) {
      dels.push({ id: uid_(), buyurtma_id: oid, mijoz_id: c.id, sana: d, holat: d < today_() ? 'yetkazildi' : 'rejada', sabab: '',
        kuryer_id: '', hudud: a.hudud, ratsion_id: ratsion.id, izoh: '', vaqt: '', yoldaman_vaqt: '' });
    });
  }
  insertMany_('Buyurtmalar', orders, 'tizim');
  insertMany_('Tolovlar', orders.map(function (o) {
    return { buyurtma_id: o.id, summa: o.tolanadi, usul: 'karta', sana: o.yaratilgan.slice(0, 10), holat: 'tasdiqlandi',
      tasdiqlagan: 'tizim', chek_rasm: '', izoh: 'test', yaratilgan: o.yaratilgan };
  }), 'tizim');
  for (var k = 0; k < dels.length; k += 2000) insertMany_('Yetkazishlar', dels.slice(k, k + 2000), 'tizim');
  dbFlush_();
  return 'Qo\'shildi: 100 mijoz, 300 buyurtma, ' + dels.length + ' yetkazish';
}
