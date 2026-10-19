/**
 * Admin panel (7-bo'lim): Bugun, buyurtmalar ro'yxati, menyu, narx va paketlar,
 * keshbek qoidasi, foydalanuvchilar, sozlamalar, audit.
 */

/** "Bugun" ekrani: nima ish kutayotganini darhol ko'rsatadi. */
function adminToday_(ctx) {
  var t = today_();
  var tomorrow = addDays_(t, 1);
  var orders = all_('Buyurtmalar');
  var pendingOrders = orders.filter(function (o) { return o.holat === 'tolov_kutish'; });
  var pendingPays = where_('Tolovlar', function (p) { return p.holat === 'kutilmoqda'; });
  var todayD = where_('Yetkazishlar', function (d) {
    return d.sana === t && (d.holat === 'rejada' || d.holat === 'yetkazildi' || d.holat === 'yetkazilmadi');
  });
  var endOfDay = hmToMin_(nowHM_()) >= hmToMin_(setting_('kun_oxiri_vaqti'));
  // kun oxirida belgilanmagan yetkazishlar qizil (8.4)
  var unmarked = where_('Yetkazishlar', function (d) {
    return d.holat === 'rejada' && (d.sana < t || (d.sana === t && endOfDay));
  }).map(function (d) {
    var c = deliveryCard_(d);
    c.kuryer = courierName_(d.kuryer_id);
    return c;
  });
  var unassigned = where_('Yetkazishlar', function (d) {
    return d.holat === 'rejada' && !d.kuryer_id && (d.sana === t || d.sana === tomorrow);
  }).length;
  var warnDays = settingNum_('paket_eslatma_kun') || 2;
  var expiring = orders.filter(function (o) { return o.holat === 'faol'; }).map(function (o) {
    return { o: o, left: remainingDays_(o.id) };
  }).filter(function (x) { return x.left <= warnDays; }).map(function (x) {
    var c = get_('Mijozlar', x.o.mijoz_id) || {};
    return { buyurtma_id: x.o.id, mijoz: c.ism, telefon: c.telefon, qolgan_kun: x.left, tugash: x.o.tugash };
  });
  var res = {
    sana: t,
    sozlash: {
      ratsion: all_('Ratsionlar').filter(function (r) { return r.faol && priceRow_(r.id, t); }).length,
      paket: activePackages_(t).length,
      katalog: catalogList_().length,
      karta: !!setting_('karta_raqami')
    },
    tolov_kutilmoqda: {
      buyurtmalar: pendingOrders.length,
      cheklar: pendingPays.length,
      items: pendingPays.map(function (p) {
        var o = get_('Buyurtmalar', p.buyurtma_id) || {};
        var c = get_('Mijozlar', o.mijoz_id) || {};
        return { tolov_id: p.id, buyurtma_id: o.id, mijoz: c.ism, summa: p.summa, usul: p.usul, chek: !!p.chek_rasm, sana: p.yaratilgan };
      })
    },
    bugun: {
      jami: todayD.length,
      yetkazildi: todayD.filter(function (d) { return d.holat === 'yetkazildi'; }).length,
      yetkazilmadi: todayD.filter(function (d) { return d.holat === 'yetkazilmadi'; }).length,
      qoldi: todayD.filter(function (d) { return d.holat === 'rejada'; }).length
    },
    ertaga: kitchenReport_(tomorrow),
    tugayotgan: expiring,
    belgilanmagan: unmarked,
    biriktirilmagan: unassigned,
    telefon_sorovlar: all_('Mijozlar').filter(function (c) { return c.faol && c.telefon_sorov; }).length,
    kesish_vaqti: setting_('kesish_vaqti')
  };
  if (ctx.role === ROLES.PARTNER) {
    res.katta_xarajatlar = where_('Xarajatlar', function (x) { return x.faol && x.holat === 'tasdiq_kutilmoqda'; }).length;
  }
  return res;
}

/** Buyurtmalar ro'yxati va filtr (holat, sana, hudud, qidiruv). */
function ordersList_(p) {
  var q = String(p.q || '').toLowerCase().trim();
  var rows = all_('Buyurtmalar').filter(function (o) {
    if (p.holat && o.holat !== p.holat) return false;
    var created = String(o.yaratilgan).slice(0, 10);
    if (p.dan && (o.tugash < p.dan && created < p.dan)) return false;
    if (p.gacha && (o.boshlanish > p.gacha && created > p.gacha)) return false;
    if (p.hudud) {
      var a = get_('Manzillar', o.manzil_id) || {};
      if (a.hudud !== p.hudud) return false;
    }
    if (p.chek && !orderPayments_(o.id).some(function (x) { return x.holat === 'kutilmoqda'; })) return false;
    if (q) {
      var c = get_('Mijozlar', o.mijoz_id) || {};
      if (String(c.ism).toLowerCase().indexOf(q) < 0 && String(c.telefon).indexOf(q.replace(/\D/g, '') || '@@') < 0 && o.id !== q) return false;
    }
    return true;
  }).sort(function (a, b) { return a.yaratilgan < b.yaratilgan ? 1 : -1; });
  return {
    jami: rows.length,
    items: rows.slice(0, 200).map(function (o) {
      var c = get_('Mijozlar', o.mijoz_id) || {};
      var r = get_('Ratsionlar', o.ratsion_id) || {};
      var a = get_('Manzillar', o.manzil_id) || {};
      return {
        id: o.id, mijoz: c.ism, telefon: c.telefon, ratsion: r.nom, kunlar: o.kunlar,
        boshlanish: o.boshlanish, tugash: o.tugash, holat: o.holat, holat_nomi: ORDER_STATUS[o.holat],
        tolov_holati: o.tolov_holati, tolov_holati_nomi: PAY_STATUS[o.tolov_holati], tolanadi: o.tolanadi,
        hudud: a.hudud, kim_yaratdi: o.kim_yaratdi, yaratilgan: o.yaratilgan,
        chek_kutilmoqda: orderPayments_(o.id).some(function (x) { return x.holat === 'kutilmoqda'; })
      };
    }),
    holatlar: ORDER_STATUS,
    hududlar: settingJson_('hududlar', [])
  };
}

// ---------- Foydalanuvchilar (faqat sherik) ----------

var STAFF_ROLES = [ROLES.PARTNER, ROLES.OPERATOR, ROLES.COURIER];

function usersList_() {
  return {
    items: all_('Foydalanuvchilar').filter(function (u) { return u.rol !== ROLES.CLIENT; }).map(function (u) {
      return pick_(u, ['id', 'tg_id', 'rol', 'ism', 'faol', 'yaratilgan']);
    }),
    rollar: STAFF_ROLES
  };
}

function userSave_(ctx, p) {
  var actor = actor_(ctx);
  if (STAFF_ROLES.indexOf(p.rol) < 0) fail('Rolni tanlang');
  var ism = reqStr_(p.ism, 'Ism', 80);
  if (p.id) {
    var u = mustGet_('Foydalanuvchilar', p.id, 'Foydalanuvchi');
    if (u.rol === ROLES.CLIENT) fail('Mijoz rolini bu yerda o\'zgartirib bo\'lmaydi');
    if (u.id === ctx.user.id && p.rol !== ROLES.PARTNER) fail('O\'z rolingizni pasaytira olmaysiz');
    return update_('Foydalanuvchilar', u.id, { rol: p.rol, ism: ism }, actor, { amal: 'rol_ozgartirish', muhim: 'rol' });
  }
  var tg = String(p.tg_id || '').replace(/\D/g, '');
  if (!tg || tg.length < 5) fail('Telegram ID noto\'g\'ri (faqat raqam)');
  var existing = all_('Foydalanuvchilar').filter(function (x) { return x.tg_id === tg && x.faol; })[0];
  if (existing) fail('Bu Telegram ID allaqachon "' + existing.rol + '" rolida');
  return insert_('Foydalanuvchilar', { tg_id: tg, rol: p.rol, ism: ism, faol: true, yaratilgan: nowIso_() }, actor, { muhim: 'rol' });
}

function userDeactivate_(ctx, id) {
  var u = mustGet_('Foydalanuvchilar', id, 'Foydalanuvchi');
  if (u.rol === ROLES.CLIENT) fail('Mijozni bu yerdan o\'chirib bo\'lmaydi');
  if (u.id === ctx.user.id) fail('O\'zingizni o\'chira olmaysiz');
  if (u.rol === ROLES.PARTNER) {
    var partners = all_('Foydalanuvchilar').filter(function (x) { return x.rol === ROLES.PARTNER && x.faol; });
    if (partners.length <= 1) fail('Oxirgi sherikni o\'chirib bo\'lmaydi');
  }
  update_('Foydalanuvchilar', u.id, { faol: false }, actor_(ctx), { amal: 'rol_ochirish', muhim: 'rol' });
  if (u.rol === ROLES.COURIER) {
    // kelgusi yetkazishlar biriktirilmagan bo'lib qoladi
    where_('Yetkazishlar', function (d) { return d.kuryer_id === u.id && d.holat === 'rejada' && d.sana >= today_(); })
      .forEach(function (d) { update_('Yetkazishlar', d.id, { kuryer_id: '' }, actor_(ctx), { audit: false }); });
  }
  return { ok: true };
}

// ---------- Menyu ----------

function menuList_(p) {
  var from = p.dan || today_();
  var to = p.gacha || addDays_(from, 6);
  return {
    dan: from, gacha: to,
    items: where_('Menyu', function (m) { return m.faol && m.sana >= from && m.sana <= to; })
      .sort(function (a, b) { return a.sana < b.sana ? -1 : 1; })
      .map(function (m) {
        return { id: m.id, sana: m.sana, ratsion_id: m.ratsion_id, ratsion: (get_('Ratsionlar', m.ratsion_id) || {}).nom, taomlar: m.taomlar, kaloriya: m.kaloriya };
      }),
    ratsionlar: all_('Ratsionlar').filter(function (r) { return r.faol; }).map(function (r) { return pick_(r, ['id', 'nom', 'kaloriya']); })
  };
}

function menuSave_(ctx, p) {
  var row = {
    sana: reqDate_(p.sana, 'Sana'),
    ratsion_id: mustGet_('Ratsionlar', p.ratsion_id, 'Ratsion').id,
    taomlar: reqStr_(p.taomlar, 'Taomlar', 1000),
    kaloriya: p.kaloriya ? reqInt_(p.kaloriya, 'Kaloriya', 0, 10000) : 0,
    faol: true
  };
  if (p.id) {
    mustGet_('Menyu', p.id, 'Menyu');
    return update_('Menyu', p.id, row, actor_(ctx));
  }
  var dup = where_('Menyu', function (m) { return m.faol && m.sana === row.sana && m.ratsion_id === row.ratsion_id; })[0];
  if (dup) return update_('Menyu', dup.id, row, actor_(ctx));
  return insert_('Menyu', row, actor_(ctx));
}

function menuRemove_(ctx, id) {
  mustGet_('Menyu', id, 'Menyu');
  update_('Menyu', id, { faol: false }, actor_(ctx));
  return { ok: true };
}

// ---------- Narx va paketlar, keshbek qoidasi (faqat sherik) ----------

function pricingOverview_() {
  var t = today_();
  var rations = all_('Ratsionlar').map(function (r) {
    var cur = priceRow_(r.id, t);
    return {
      id: r.id, nom: r.nom, kaloriya: r.kaloriya, tavsif: r.tavsif, faol: r.faol,
      tannarx_ovqat: r.tannarx_ovqat, tannarx_qadoq_yetkazish: r.tannarx_qadoq_yetkazish, tannarx: rationCost_(r),
      joriy_narx: cur ? cur.kunlik_narx : 0,
      tarix: where_('Narxlar', function (n) { return n.ratsion_id === r.id; })
        .sort(function (a, b) { return a.qachondan < b.qachondan ? 1 : -1; })
        .map(function (n) { return pick_(n, ['id', 'kunlik_narx', 'qachondan', 'faol', 'yaratilgan']); })
    };
  });
  return {
    sana: t,
    ratsionlar: rations,
    paketlar_joriy: activePackages_(t).map(function (p) { return pick_(p, ['id', 'nom', 'kunlar', 'chegirma_foiz', 'qachondan']); }),
    paketlar_tarix: all_('Paketlar').slice().sort(function (a, b) { return a.kunlar - b.kunlar || (a.qachondan < b.qachondan ? 1 : -1); })
      .map(function (p) { return pick_(p, ['id', 'nom', 'kunlar', 'chegirma_foiz', 'qachondan', 'faol', 'yaratilgan']); }),
    keshbek_joriy: cashbackRule_(t),
    keshbek_tarix: all_('KeshbekQoida').slice().sort(function (a, b) { return a.qachondan < b.qachondan ? 1 : -1; }),
    ogohlantirishlar: marginWarnings_({})
  };
}

/** Saqlashdan oldin marja tekshiriladi; ogohlantirish bo'lsa tasdiq (tasdiq: true) talab qilinadi. */
function guardMargin_(warnings, p) {
  if (warnings.length && p.tasdiq !== true) {
    var e = new AppError('Marja qo\'riqchisi: narx tannarxdan past!', 'marja');
    e.data = { ogohlantirishlar: warnings };
    throw e;
  }
}

function rationSave_(ctx, p) {
  var row = {
    nom: reqStr_(p.nom, 'Nomi', 80),
    kaloriya: optStr_(p.kaloriya, 30),       // son yoki oraliq: "1200", "900–1000"
    tavsif: optStr_(p.tavsif, 2000),         // doimiy menyu / tavsif (mijozga ko'rinadi)
    tannarx_ovqat: reqMoney_(p.tannarx_ovqat || 0, 'Ovqat tannarxi', true),
    tannarx_qadoq_yetkazish: reqMoney_(p.tannarx_qadoq_yetkazish || 0, 'Qadoq va yetkazish tannarxi', true),
    faol: p.faol !== false
  };
  var actor = actor_(ctx);
  if (p.id) {
    mustGet_('Ratsionlar', p.id, 'Ratsion');
    guardMargin_(marginWarnings_({ ratsion_id: p.id, tannarx: row.tannarx_ovqat + row.tannarx_qadoq_yetkazish }), p);
    return update_('Ratsionlar', p.id, row, actor, { amal: 'ratsion_tahrir', muhim: 'narx' });
  }
  return insert_('Ratsionlar', row, actor, { muhim: 'narx' });
}

/** Yangi narx = yangi qator; eskisi o'chmaydi (5.2). */
function priceAdd_(ctx, p) {
  var r = mustGet_('Ratsionlar', p.ratsion_id, 'Ratsion');
  var price = reqMoney_(p.kunlik_narx, 'Kunlik narx');
  var from = reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() });
  guardMargin_(marginWarnings_({ ratsion_id: r.id, kunlik_narx: price, date: from }), p);
  return insert_('Narxlar', { ratsion_id: r.id, kunlik_narx: price, qachondan: from, faol: true, yaratilgan: nowIso_() },
    actor_(ctx), { amal: 'narx_qoshish', muhim: 'narx' });
}

function packageAdd_(ctx, p) {
  var days = reqInt_(p.kunlar, 'Kunlar', 1, 120);
  var disc = reqPercent_(p.chegirma_foiz || 0, 'Chegirma');
  var from = reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() });
  var faol = p.faol !== false;
  var row = { nom: optStr_(p.nom, 50) || (days + ' kunlik'), kunlar: days, chegirma_foiz: disc, qachondan: from, faol: faol, yaratilgan: nowIso_() };
  if (faol) guardMargin_(marginWarnings_({ paket: row, date: from }), p);
  return insert_('Paketlar', row, actor_(ctx), { amal: 'paket_qoshish', muhim: 'narx' });
}

function cashbackRuleAdd_(ctx, p) {
  var row = {
    foiz: reqPercent_(p.foiz, 'Keshbek foizi'),
    amal_muddati_kun: reqInt_(p.amal_muddati_kun, 'Amal muddati', 1, 3650),
    min_summa: reqMoney_(p.min_summa || 0, 'Minimal summa', true),
    max_ulush_foiz: reqPercent_(p.max_ulush_foiz || 0, 'Bitta buyurtmadagi chegara'),
    qachondan: reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() }),
    yaratilgan: nowIso_()
  };
  guardMargin_(marginWarnings_({ keshbek_foiz: row.foiz, date: row.qachondan }), p);
  return insert_('KeshbekQoida', row, actor_(ctx), { amal: 'keshbek_qoida', muhim: 'narx' });
}

// ---------- Sozlamalar, audit ----------

function settingsView_() {
  return { qiymatlar: settingsMap_(), standart: DEFAULT_SETTINGS };
}

function auditList_(p) {
  var rows = all_('Audit');
  var q = String(p.q || '').toLowerCase();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < 300; i--) {
    var a = rows[i];
    if (p.varaq && a.varaq !== p.varaq) continue;
    if (p.muhim && !a.muhim) continue;
    if (p.dan && a.vaqt.slice(0, 10) < p.dan) continue;
    if (p.gacha && a.vaqt.slice(0, 10) > p.gacha) continue;
    if (q && (a.kim + ' ' + a.amal + ' ' + a.yozuv_id + ' ' + a.yangi).toLowerCase().indexOf(q) < 0) continue;
    out.push(a);
  }
  return { items: out, varaqlar: Object.keys(SCHEMA) };
}

/** Chek rasmini ko'rish: to'lov cheki — sherik/operator, xarajat cheki — faqat sherik. */
function fileView_(ctx, p) {
  var fileId;
  if (p.tolov_id) {
    fileId = mustGet_('Tolovlar', p.tolov_id, 'To\'lov').chek_rasm;
  } else if (p.xarajat_id) {
    requireRole_(ctx, [ROLES.PARTNER]);
    fileId = mustGet_('Xarajatlar', p.xarajat_id, 'Xarajat').chek_rasm;
  }
  if (!fileId) fail('Rasm yo\'q');
  return { data: readImage_(fileId) };
}

// ---------- Oylik katalog (rasmlar) ----------

var CATALOG_MAX = 12;

function catalogList_() {
  var list = settingJson_('katalog', []);
  return Array.isArray(list) ? list : [];
}

/** Mijoz va xodimlar uchun: rasmlarning ochiq manzillari. */
function catalogView_() {
  var base = ENV_.PUBLIC_STORAGE_URL || '';
  return {
    rasmlar: catalogList_().map(function (x, i) {
      return { i: i, nom: x.nom || '', url: base + x.yol, yuklangan: x.yuklangan || '' };
    }),
    yangilangan: catalogList_().reduce(function (m, x) { return x.yuklangan > m ? x.yuklangan : m; }, '')
  };
}

function catalogAdd_(ctx, p) {
  var list = catalogList_();
  if (list.length >= CATALOG_MAX) fail('Katalogda ko\'pi bilan ' + CATALOG_MAX + ' ta rasm bo\'ladi');
  var yol = saveImage_(p.rasm, 'katalog', 'katalog');
  list.push({ yol: yol, nom: optStr_(p.nom, 80), yuklangan: today_() });
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}

/** Rasmni katalogdan olib tashlash (fayl Storage'da qoladi — hech narsa jismoniy o'chirilmaydi). */
function catalogRemove_(ctx, p) {
  var list = catalogList_();
  var i = Number(p.i);
  if (!(i >= 0 && i < list.length)) fail('Rasm topilmadi', 'topilmadi');
  list.splice(i, 1);
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}

function catalogMove_(ctx, p) {
  var list = catalogList_();
  var i = Number(p.i), j = i + (p.yon === 'yuqori' ? -1 : 1);
  if (!(i >= 0 && i < list.length && j >= 0 && j < list.length)) return catalogView_();
  var t = list[i]; list[i] = list[j]; list[j] = t;
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}
