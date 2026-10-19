/**
 * Mijozlar: ro'yxatdan o'tish, profil, manzillar (6-bo'lim) va admin uchun mijoz kartasi (7-bo'lim).
 * Mijoz faqat o'z ma'lumotini ko'radi: mijoz id hech qachon so'rovdan olinmaydi, faqat Telegram ID dan.
 */

// ---------- Telegramdan ulashilgan telefon va joylashuv ----------

/** Bot webhook kontaktni oladi (faqat o'z raqami) va vaqtincha saqlaydi. */
function storeSharedContact_(tgId, phone) {
  CacheService.getScriptCache().put('contact_' + tgId, normPhone_(phone), 3600);
}

function sharedContact_(tgId) {
  return CacheService.getScriptCache().get('contact_' + tgId) || '';
}

function storeSharedLocation_(tgId, lat, lng) {
  CacheService.getScriptCache().put('loc_' + tgId, JSON.stringify({ lat: lat, lng: lng }), 3600);
}

function sharedLocation_(tgId) {
  var v = CacheService.getScriptCache().get('loc_' + tgId);
  return v ? JSON.parse(v) : null;
}

function phoneOwner_(phone) {
  var rows = all_('Mijozlar');
  for (var i = 0; i < rows.length; i++) if (rows[i].faol && rows[i].telefon === phone) return rows[i];
  return null;
}

function validRegion_(h) {
  var list = settingJson_('hududlar', []);
  var v = reqStr_(h, 'Hudud', 80);
  if (list.indexOf(v) < 0) fail('Hududni ro\'yxatdan tanlang');
  return v;
}

function addressRow_(p) {
  var lat = reqLat_(p.lat), lng = reqLng_(p.lng);
  if ((lat === '') !== (lng === '')) fail('Xaritadagi nuqta to\'liq emas');
  return {
    nom: optStr_(p.nom, 50) || 'Uy',
    lat: lat, lng: lng,
    matn: reqStr_(p.matn, 'Manzil matni', 300),
    moljal: optStr_(p.moljal, 200),
    hudud: validRegion_(p.hudud),
    faol: true
  };
}

// ---------- Ro'yxatdan o'tish (6.1, 1-ekran) ----------

/**
 * Telefon Telegram "raqamni ulashish" orqali (bot webhook) keladi — qo'lda yozilmaydi.
 * Telefon takrorlansa yangi akkaunt ochilmaydi (11.2). Rozilik majburiy (11.5).
 */
function register_(ctx, p) {
  if (ctx.user) fail('Siz allaqachon ro\'yxatdan o\'tgansiz');
  if (p.rozilik !== true) fail('Ma\'lumotlarni qayta ishlashga rozilik bering');
  var phone = sharedContact_(ctx.tgId);
  if (!phone) fail('Avval "Raqamni ulashish" tugmasini bosing', 'telefon');
  var ism = reqStr_(p.ism, 'Ism', 80);
  var manba = SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa';
  var addr = addressRow_(p.manzil || {});
  var actor = 'mijoz:' + ctx.tgId;
  var existing = phoneOwner_(phone);
  var client;
  if (existing) {
    // admin telefon orqali yaratgan mijoz — raqam egasi Telegram orqali tasdiqlandi, bog'laymiz
    if (existing.tg_id) fail('Bu telefon raqami boshqa akkauntga bog\'langan. Admin bilan bog\'laning');
    client = update_('Mijozlar', existing.id, {
      tg_id: ctx.tgId, ism: existing.ism || ism, rozilik_vaqt: nowIso_()
    }, actor, { amal: 'akkaunt_boglash' });
  } else {
    client = insert_('Mijozlar', {
      tg_id: ctx.tgId, ism: ism, telefon: phone, manba: manba, royxatdan_sana: today_(), holat: 'yangi',
      izoh: '', til: 'uz', rozilik_vaqt: nowIso_(), telefon_sorov: '', kim_yaratdi: 'mijoz', faol: true
    }, actor);
  }
  insert_('Foydalanuvchilar', { tg_id: ctx.tgId, rol: ROLES.CLIENT, ism: client.ism, faol: true, yaratilgan: nowIso_() }, actor);
  insert_('Manzillar', Object.assign({ mijoz_id: client.id }, addr), actor);
  CacheService.getScriptCache().remove('contact_' + ctx.tgId);
  notifyStaff_('👤 Yangi mijoz ro\'yxatdan o\'tdi: ' + client.ism + ' (' + phone + '), manba: ' + manba);
  return { ok: true };
}

// ---------- Mijoz kabineti ----------

function clientAddresses_(clientId) {
  return where_('Manzillar', function (a) { return a.mijoz_id === clientId && a.faol; }).map(function (a) {
    return pick_(a, ['id', 'nom', 'lat', 'lng', 'matn', 'moljal', 'hudud']);
  });
}

function clientOrders_(clientId) {
  return where_('Buyurtmalar', function (o) { return o.mijoz_id === clientId; })
    .sort(function (a, b) { return a.yaratilgan < b.yaratilgan ? 1 : -1; });
}

function menuFor_(date, ratsionId) {
  return where_('Menyu', function (m) {
    return m.faol && m.sana === date && (!ratsionId || m.ratsion_id === ratsionId);
  }).map(function (m) {
    var r = get_('Ratsionlar', m.ratsion_id) || {};
    return { ratsion_id: m.ratsion_id, ratsion: r.nom || '', taomlar: m.taomlar, kaloriya: m.kaloriya || r.kaloriya };
  });
}

/** Bosh sahifa (6.1, 2-ekran). */
function clientHome_(client) {
  var orders = clientOrders_(client.id);
  var active = orders.filter(function (o) { return o.holat === 'faol'; })[0] || null;
  var pending = orders.filter(function (o) { return o.holat === 'tolov_kutish'; });
  var t = today_();
  var rid = active ? active.ratsion_id : '';
  var av = null;
  if (active) {
    var v = orderView_(active, true);
    av = {
      id: v.id, ratsion: v.ratsion, kunlar: v.kunlar, boshlanish: v.boshlanish, tugash: v.tugash,
      qolgan_kun: v.qolgan_kun, yetkazildi: v.yetkazildi, pauza: v.pauza,
      foiz: v.kunlar ? Math.round((v.kunlar - v.qolgan_kun) / v.kunlar * 100) : 0,
      bugun: (v.kunlar_jadvali.filter(function (k) { return k.sana === t; })[0] || null),
      ertaga: (v.kunlar_jadvali.filter(function (k) { return k.sana === addDays_(t, 1); })[0] || null)
    };
  }
  return {
    ism: client.ism,
    faol_paket: av,
    tolov_kutilmoqda: pending.map(function (o) {
      var v = orderView_(o, true);
      return { id: v.id, ratsion: v.ratsion, kunlar: v.kunlar, tolanadi: v.tolanadi, tolangan: v.tolangan,
        narx_muddati: v.narx_muddati, chek_yuborilgan: v.tolovlar.some(function (p) { return p.holat === 'kutilmoqda'; }) };
    }),
    menyu_kuni: { bugun: menuDayOf_(t), ertaga: menuDayOf_(addDays_(t, 1)) },
    katalog_bor: catalogList_().length > 0,
    salomatlik: (function () {
      var hv = healthView_(client);
      return { toliq: hv.toliq, kkal: hv.kkal, tavsiya: hv.tavsiya, sorash_kerak: hv.sorash_kerak, statistika: hv.statistika };
    })(),
    keshbek: cashbackBalance_(client.id),
    karta: { raqam: setting_('karta_raqami'), egasi: setting_('karta_egasi') },
    aloqa: setting_('aloqa_telefon'),
    yetkazish_vaqti: setting_('yetkazish_vaqti')
  };
}

/** Buyurtma berish ekrani uchun: katalog, eng erta sana, manzillar, keshbek. */
function orderForm_(client) {
  var off = offDays_();
  var min = earliestStart_(off);
  var cal = dateRange_(min, addDays_(min, 30)).map(function (d) { return { sana: d, ish_kuni: isWorkDay_(d, off) }; });
  return {
    katalog: catalog_(),
    eng_erta: min,
    kalendar: cal,
    kesish_vaqti: setting_('kesish_vaqti'),
    manzillar: clientAddresses_(client.id),
    hududlar: settingJson_('hududlar', []),
    keshbek_balans: cashbackBalance_(client.id),
    karta: { raqam: setting_('karta_raqami'), egasi: setting_('karta_egasi') }
  };
}

function quoteForClient_(client, p) {
  var q = quoteFor_(p.ratsion_id, p, { use_cashback: !!p.use_cashback, balans: cashbackBalance_(client.id) });
  var off = offDays_();
  var min = earliestStart_(off);
  var start = p.boshlanish && parseDate_(p.boshlanish) && p.boshlanish >= min ? p.boshlanish : min;
  var dates = deliveryDates_(start, q.kunlar, off);
  q.boshlanish = dates[0];
  q.tugash = dates[dates.length - 1];
  return q;
}

function clientOwnOrder_(ctx, orderId) {
  var o = mustGet_('Buyurtmalar', orderId, 'Buyurtma');
  // boshqa mijozning buyurtmasi — "topilmadi" (mavjudligini ham oshkor qilmaymiz)
  if (o.mijoz_id !== ctx.client.id) fail('Buyurtma topilmadi', 'topilmadi');
  return o;
}

function clientOwnAddress_(ctx, id) {
  var a = mustGet_('Manzillar', id, 'Manzil');
  if (a.mijoz_id !== ctx.client.id || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  return a;
}

function addressSave_(ctx, clientId, p) {
  var row = addressRow_(p);
  if (p.id) {
    var a = mustGet_('Manzillar', p.id, 'Manzil');
    if (a.mijoz_id !== clientId || !a.faol) fail('Manzil topilmadi', 'topilmadi');
    update_('Manzillar', a.id, row, actor_(ctx));
    // kelgusi yetkazishlarda hudud yangilanadi
    where_('Buyurtmalar', function (o) { return o.manzil_id === a.id && o.holat === 'faol'; }).forEach(function (o) {
      orderDeliveries_(o.id).forEach(function (d) {
        if (d.holat === 'rejada' && d.sana > today_() && d.hudud !== row.hudud) {
          update_('Yetkazishlar', d.id, { hudud: row.hudud, kuryer_id: courierFor_(row.hudud) || d.kuryer_id }, actor_(ctx), { audit: false });
        }
      });
    });
    return a;
  }
  var count = where_('Manzillar', function (x) { return x.mijoz_id === clientId && x.faol; }).length;
  if (count >= 10) fail('Ko\'pi bilan 10 ta manzil');
  return insert_('Manzillar', Object.assign({ mijoz_id: clientId }, row), actor_(ctx));
}

function addressRemove_(ctx, clientId, id) {
  var a = mustGet_('Manzillar', id, 'Manzil');
  if (a.mijoz_id !== clientId || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  var used = where_('Buyurtmalar', function (o) {
    return o.manzil_id === id && (o.holat === 'faol' || o.holat === 'tolov_kutish');
  }).length;
  if (used) fail('Bu manzil faol buyurtmada ishlatilmoqda');
  update_('Manzillar', id, { faol: false }, actor_(ctx));
  return { ok: true };
}

/** Buyurtma manzilini almashtirish (faqat kelgusi kunlarga ta'sir qiladi). */
function orderChangeAddress_(ctx, order, addressId, minDate) {
  var a = mustGet_('Manzillar', addressId, 'Manzil');
  if (a.mijoz_id !== order.mijoz_id || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  update_('Buyurtmalar', order.id, { manzil_id: a.id }, actor_(ctx));
  orderDeliveries_(order.id).forEach(function (d) {
    if (d.holat === 'rejada' && d.sana >= minDate) {
      update_('Yetkazishlar', d.id, { hudud: a.hudud, kuryer_id: courierFor_(a.hudud) || d.kuryer_id }, actor_(ctx), { audit: false });
    }
  });
  return { ok: true };
}

function profileView_(client) {
  return {
    ism: client.ism, telefon: client.telefon, til: client.til || 'uz', manba: client.manba,
    royxatdan_sana: client.royxatdan_sana, telefon_sorov: client.telefon_sorov
  };
}

function profileUpdate_(ctx, p) {
  var patch = {};
  if (p.ism !== undefined) patch.ism = reqStr_(p.ism, 'Ism', 80);
  if (p.til !== undefined) patch.til = p.til === 'ru' ? 'ru' : 'uz';
  update_('Mijozlar', ctx.client.id, patch, actor_(ctx));
  if (patch.ism) update_('Foydalanuvchilar', ctx.user.id, { ism: patch.ism }, actor_(ctx));
  return profileView_(ctx.client);
}

/** Telefon bir martalik; o'zgartirish faqat admin orqali (6.4). */
function requestPhoneChange_(ctx, p) {
  var phone = normPhone_(p.telefon);
  if (phone === ctx.client.telefon) fail('Bu sizning hozirgi raqamingiz');
  update_('Mijozlar', ctx.client.id, { telefon_sorov: phone }, actor_(ctx), { amal: 'telefon_sorov' });
  notifyStaff_('📞 Telefon o\'zgartirish so\'rovi: ' + ctx.client.ism + ' ' + ctx.client.telefon + ' → ' + phone);
  return { ok: true };
}

// ---------- Admin: mijozlar ----------

function clientRow_(c) {
  return {
    id: c.id, ism: c.ism, telefon: c.telefon, manba: c.manba, holat: c.holat,
    holat_nomi: CLIENT_STATUS[c.holat] || c.holat, royxatdan_sana: c.royxatdan_sana,
    telefon_sorov: c.telefon_sorov, telegram: !!c.tg_id, izoh: c.izoh, faol: c.faol
  };
}

function clientsSearch_(p) {
  var q = String(p.q || '').toLowerCase().trim();
  var digits = q.replace(/\D/g, '');
  var rows = all_('Mijozlar').filter(function (c) {
    if (!c.faol && !p.hammasi) return false;
    if (p.holat && c.holat !== p.holat) return false;
    if (p.manba && c.manba !== p.manba) return false;
    if (p.telefon_sorov && !c.telefon_sorov) return false;
    if (!q) return true;
    return String(c.ism).toLowerCase().indexOf(q) >= 0 || (digits.length >= 3 && String(c.telefon).replace(/\D/g, '').indexOf(digits) >= 0);
  });
  rows.sort(function (a, b) { return a.royxatdan_sana < b.royxatdan_sana ? 1 : -1; });
  var total = rows.length;
  return { jami: total, items: rows.slice(0, 100).map(clientRow_), manbalar: SOURCES, holatlar: CLIENT_STATUS };
}

function clientDetail_(id) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var cb = cashbackSummary_(c.id);
  return {
    mijoz: clientRow_(c),
    buyurtmalar: clientOrders_(c.id).map(function (o) {
      var r = get_('Ratsionlar', o.ratsion_id) || {};
      return {
        id: o.id, ratsion: r.nom, kunlar: o.kunlar, boshlanish: o.boshlanish, tugash: o.tugash,
        holat: o.holat, holat_nomi: ORDER_STATUS[o.holat], tolanadi: o.tolanadi, tolov_holati: o.tolov_holati,
        kim_yaratdi: o.kim_yaratdi, yaratilgan: o.yaratilgan
      };
    }),
    manzillar: clientAddresses_(c.id),
    keshbek: cb,
    salomatlik: (function () {
      var hv = healthView_(c);
      return {
        toliq: hv.toliq, kkal: hv.kkal, tavsiya: hv.tavsiya, statistika: hv.statistika, tarix: hv.tarix,
        maqsad: goalLabel_(c), faollik: (ACTIVITY[c.faollik] || {}).nom || '', prognoz: hv.prognoz, reja: hv.reja,
        boy: c.boy || '', vazn: c.vazn || '', jins: c.jins, tugilgan_yil: c.tugilgan_yil || ''
      };
    })(),
    hududlar: settingJson_('hududlar', []),
    manbalar: SOURCES
  };
}

/** Operator yoki sherik telefon orqali yozgan mijozni qo'shadi. */
function clientCreate_(ctx, p) {
  var phone = normPhone_(p.telefon);
  if (phoneOwner_(phone)) fail('Bu telefon raqami bilan mijoz allaqachon bor');
  var c = insert_('Mijozlar', {
    tg_id: '', ism: reqStr_(p.ism, 'Ism', 80), telefon: phone,
    manba: SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa', royxatdan_sana: today_(), holat: 'yangi',
    izoh: optStr_(p.izoh, 500), til: 'uz', rozilik_vaqt: '', telefon_sorov: '', kim_yaratdi: 'admin', faol: true
  }, actor_(ctx));
  if (p.manzil && p.manzil.matn) insert_('Manzillar', Object.assign({ mijoz_id: c.id }, addressRow_(p.manzil)), actor_(ctx));
  return clientRow_(c);
}

function clientUpdate_(ctx, id, p) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var patch = {};
  if (p.ism !== undefined) patch.ism = reqStr_(p.ism, 'Ism', 80);
  if (p.manba !== undefined) patch.manba = SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa';
  if (p.izoh !== undefined) patch.izoh = optStr_(p.izoh, 500);
  if (p.telefon !== undefined) {
    var phone = normPhone_(p.telefon);
    var owner = phoneOwner_(phone);
    if (owner && owner.id !== c.id) fail('Bu raqam boshqa mijozda bor');
    patch.telefon = phone;
  }
  update_('Mijozlar', c.id, patch, actor_(ctx), { amal: 'mijoz_tahrir' });
  if (patch.ism && c.tg_id) {
    all_('Foydalanuvchilar').forEach(function (u) {
      if (u.tg_id === c.tg_id && u.rol === ROLES.CLIENT) update_('Foydalanuvchilar', u.id, { ism: patch.ism }, actor_(ctx));
    });
  }
  return clientRow_(c);
}

function phoneChangeDecide_(ctx, id, approve) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  if (!c.telefon_sorov) fail('So\'rov yo\'q');
  var actor = actor_(ctx);
  if (approve) {
    var owner = phoneOwner_(c.telefon_sorov);
    if (owner && owner.id !== c.id) fail('Bu raqam boshqa mijozda bor');
    update_('Mijozlar', c.id, { telefon: c.telefon_sorov, telefon_sorov: '' }, actor, { amal: 'telefon_ozgardi', muhim: 'telefon' });
    notifyClient_(c.id, '📞 Telefon raqamingiz yangilandi: ' + c.telefon);
  } else {
    update_('Mijozlar', c.id, { telefon_sorov: '' }, actor, { amal: 'telefon_rad' });
    notifyClient_(c.id, '📞 Telefon raqamini o\'zgartirish so\'rovi rad etildi. Savollar bo\'lsa biz bilan bog\'laning.');
  }
  return clientRow_(c);
}

/** Keshbekni qo'lda to'g'rilash: izoh majburiy, Auditga alohida belgi bilan yoziladi (7, 11.3). */
function cashbackAdjust_(ctx, clientId, p) {
  var c = mustGet_('Mijozlar', clientId, 'Mijoz');
  var izoh = reqStr_(p.izoh, 'Izoh', 300);
  var n = Number(p.summa);
  if (!isFinite(n) || Math.round(n) !== n || n === 0) fail('Summa noldan farqli butun son bo\'lishi kerak');
  var max = settingNum_('max_summa');
  if (Math.abs(n) > max) fail('Summa juda katta');
  var actor = actor_(ctx);
  if (n > 0) {
    cbCredit_(c.id, '', n, 'tuzatish', izoh, actor, { muhim: 'keshbek_tuzatish' });
  } else {
    var bal = cashbackBalance_(c.id);
    if (-n > bal) fail('Balansdan ko\'p ayirib bo\'lmaydi (balans ' + bal + ')');
    cbInsert_({ mijoz_id: c.id, buyurtma_id: '', tur: 'tuzatish', summa: n, izoh: izoh }, actor, { muhim: 'keshbek_tuzatish' });
  }
  return cashbackSummary_(c.id);
}

/**
 * Mijoz ma'lumotini o'chirishni so'rasa: shaxsiy maydonlar anonimlashtiriladi,
 * buyurtma va pul yozuvlari hisob uchun qoladi (11.5).
 */
function clientAnonymize_(ctx, id) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var active = where_('Buyurtmalar', function (o) {
    return o.mijoz_id === c.id && (o.holat === 'faol' || o.holat === 'tolov_kutish');
  }).length;
  if (active) fail('Mijozda faol buyurtma bor. Avval uni yakunlang yoki bekor qiling');
  var actor = actor_(ctx);
  var tg = c.tg_id;
  update_('Mijozlar', c.id, {
    ism: 'Anonim-' + c.id.slice(0, 4), telefon: '', tg_id: '', izoh: '', telefon_sorov: '', faol: false
  }, actor, { amal: 'anonimlashtirish', muhim: 'shaxsiy' });
  where_('Manzillar', function (a) { return a.mijoz_id === c.id; }).forEach(function (a) {
    update_('Manzillar', a.id, { matn: '—', moljal: '', lat: '', lng: '', faol: false }, actor, { amal: 'anonimlashtirish' });
  });
  if (tg) {
    all_('Foydalanuvchilar').forEach(function (u) {
      if (u.tg_id === tg && u.rol === ROLES.CLIENT) update_('Foydalanuvchilar', u.id, { faol: false, tg_id: '', ism: 'Anonim' }, actor);
    });
  }
  return { ok: true };
}
