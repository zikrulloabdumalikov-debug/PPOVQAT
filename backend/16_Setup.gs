/**
 * O'rnatish: varaqlarni yaratish, boshlang'ich ma'lumot, trigger va Telegram webhook.
 * Apps Script muharririda ketma-ket ishga tushiriladi (README, "O'rnatish").
 */

/** 1-qadam: barcha varaqlar, sarlavhalar, standart sozlamalar va turkumlar. */
function setup() {
  dbReset_();
  var ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    var cols = SCHEMA[name].map(function (c) { return c[0]; });
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String).filter(function (h) { return h; });
    var missing = cols.filter(function (c) { return header.indexOf(c) < 0; });
    if (!header.length) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    } else if (missing.length) {
      sh.getRange(1, header.length + 1, 1, missing.length).setValues([missing]); // yangi ustunlar oxiriga
    }
    var total = header.length ? header.length + missing.length : cols.length;
    sh.getRange(1, 1, sh.getMaxRows(), total).setNumberFormat('@');
    sh.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#e8f5e9');
    sh.setFrozenRows(1);
    // Sheriklar jadvalni qo'lda tahrirlamaydi (4-bo'lim): qo'lda o'zgartirishda ogohlantirish chiqadi
    var prot = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (!prot.length) sh.protect().setDescription('Faqat ilova orqali tahrirlang').setWarningOnly(true);
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1') || ss.getSheetByName('Varaq1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  dbReset_();

  if (!all_('XarajatTurkum').length) {
    insertMany_('XarajatTurkum', DEFAULT_CATEGORIES.map(function (c) {
      return { nom: c[0], guruh: c[1], kod: c[2], hissa: c[3], faol: true };
    }), 'tizim');
  }
  var have = {};
  all_('Sozlama').forEach(function (r) { have[r.kalit] = true; });
  var rows = Object.keys(DEFAULT_SETTINGS).filter(function (k) { return !have[k]; }).map(function (k) {
    return { kalit: k, qiymat: DEFAULT_SETTINGS[k] };
  });
  if (rows.length) insertMany_('Sozlama', rows, 'tizim');

  var admins = String(PropertiesService.getScriptProperties().getProperty('ADMIN_TG_IDS') || '')
    .split(',').map(function (x) { return x.trim(); }).filter(function (x) { return /^\d+$/.test(x); });
  admins.forEach(function (tg, i) {
    var exists = all_('Foydalanuvchilar').some(function (u) { return u.tg_id === tg && u.faol; });
    if (!exists) insert_('Foydalanuvchilar', { tg_id: tg, rol: ROLES.PARTNER, ism: 'Sherik ' + (i + 1), faol: true, yaratilgan: nowIso_() }, 'tizim');
  });
  dbFlush_();
  return 'Tayyor: ' + Object.keys(SCHEMA).length + ' ta varaq';
}

/**
 * 2-qadam (ixtiyoriy): TZ dagi misol qiymatlar — Ozish Express, 120 000 so'm/kun,
 * paketlar 6/12/24 kun (0/5/10%), keshbek 3%, 60 kun, buyurtmaning 30% gacha.
 * Keyin hammasi admin panel orqali o'zgartiriladi.
 */
function seedExample() {
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

/** 3-qadam: har 15 daqiqada cronTick (eslatmalar, kesish vaqti, zaxira). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'cronTick') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('cronTick').timeBased().everyMinutes(15).create();
  return 'cronTick har 15 daqiqada ishlaydi';
}

/**
 * 4-qadam (web app deploy qilingandan keyin): Telegram webhook va menyu tugmasi.
 * Script Properties: BOT_TOKEN, WEBAPP_URL (Mini App manzili), API_URL (shu web app /exec manzili).
 */
function setWebhook() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('WEBHOOK_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('WEBHOOK_SECRET', secret);
  }
  var apiUrl = props.getProperty('API_URL') || ScriptApp.getService().getUrl();
  if (!apiUrl) fail('API_URL topilmadi: avval web app sifatida deploy qiling');
  var res = tgApi_('setWebhook', { url: apiUrl + '?tg=' + secret, allowed_updates: ['message'], drop_pending_updates: true });
  var url = webAppUrl_();
  if (url) tgApi_('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Ilova', web_app: { url: url } } });
  return JSON.stringify(res);
}

/**
 * Sinov uchun: 100 ta mijoz va 300 ta buyurtma (12-bo'lim, tezlik mezoni).
 * FAQAT sinov jadvalida ishlating!
 */
function seedTestData() {
  dbReset_();
  if (PropertiesService.getScriptProperties().getProperty('ALLOW_TEST_SEED') !== 'ha') {
    fail('Sinov ma\'lumoti faqat ALLOW_TEST_SEED=ha bo\'lganda qo\'shiladi');
  }
  seedExample();
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
