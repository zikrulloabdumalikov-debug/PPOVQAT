/**
 * Dastavka bo'limi (8-bo'lim): kuryer ekrani, biriktirish, oshxona hisoboti.
 * Kuryer narx, to'lov, keshbek va boshqa mijoz tarixini ko'rmaydi.
 */

function courierName_(id) {
  var u = id ? get_('Foydalanuvchilar', id) : null;
  return u ? u.ism : '';
}

/** Kuryer kartasi uchun faqat kerakli maydonlar (8.3). */
function deliveryCard_(d) {
  var c = get_('Mijozlar', d.mijoz_id) || {};
  var o = get_('Buyurtmalar', d.buyurtma_id) || {};
  var a = get_('Manzillar', o.manzil_id) || {};
  var r = get_('Ratsionlar', d.ratsion_id) || {};
  var hasGeo = a.lat !== '' && a.lng !== '' && a.lat !== undefined;
  return {
    id: d.id,
    sana: d.sana,
    holat: d.holat,
    holat_nomi: DELIVERY_STATUS[d.holat] || d.holat,
    sabab: d.sabab ? ((FAIL_REASONS[d.sabab] || {}).nom || d.sabab) : '',
    hudud: d.hudud || a.hudud || 'Hududsiz',
    ism: c.ism || '',
    telefon: c.telefon || '',
    manzil: a.matn || '',
    moljal: a.moljal || '',
    lat: hasGeo ? a.lat : '',
    lng: hasGeo ? a.lng : '',
    yandex: hasGeo ? 'https://yandex.uz/maps/?pt=' + a.lng + ',' + a.lat + '&z=17&l=map' : '',
    google: hasGeo ? 'https://www.google.com/maps/search/?api=1&query=' + a.lat + ',' + a.lng : '',
    ratsion: r.nom || '',
    izoh: d.izoh || '',
    vaqt: d.vaqt || '',
    yoldaman: !!d.yoldaman_vaqt
  };
}

function groupCards_(cards) {
  var groups = {};
  cards.forEach(function (c) { (groups[c.hudud] = groups[c.hudud] || []).push(c); });
  return Object.keys(groups).sort().map(function (h) {
    var items = groups[h].sort(function (a, b) {
      var da = a.holat === 'rejada' ? 0 : 1, db = b.holat === 'rejada' ? 0 : 1;
      if (da !== db) return da - db; // yetkazilganlar ro'yxat oxiriga tushadi
      return a.ism < b.ism ? -1 : 1;
    });
    return { hudud: h, soni: items.length, qoldi: items.filter(function (x) { return x.holat === 'rejada'; }).length, items: items };
  });
}

/** Kuryerning bugungi ro'yxati (faqat o'ziga biriktirilganlar). */
function courierList_(ctx, date) {
  var d = date || today_();
  var mine = where_('Yetkazishlar', function (x) {
    return x.kuryer_id === ctx.user.id && x.sana === d && (x.holat === 'rejada' || x.holat === 'yetkazildi' || x.holat === 'yetkazilmadi');
  });
  var cards = mine.map(deliveryCard_);
  return {
    sana: d,
    jami: cards.length,
    qoldi: cards.filter(function (c) { return c.holat === 'rejada'; }).length,
    guruhlar: groupCards_(cards),
    sabablar: Object.keys(FAIL_REASONS).map(function (k) { return { kod: k, nom: FAIL_REASONS[k].nom }; })
  };
}

function deliveryForActor_(ctx, id) {
  var d = mustGet_('Yetkazishlar', id, 'Yetkazish');
  if (ctx.role === ROLES.COURIER) {
    if (d.kuryer_id !== ctx.user.id) fail('Bu yetkazish sizga biriktirilmagan', 'ruxsat');
    if (d.sana > today_()) fail('Bu yetkazish bugun uchun emas');
  }
  return d;
}

function courierOnTheWay_(ctx, id) {
  var d = deliveryForActor_(ctx, id);
  if (d.holat !== 'rejada') fail('Bu yetkazish allaqachon belgilangan');
  update_('Yetkazishlar', d.id, { yoldaman_vaqt: nowIso_() }, actor_(ctx), { amal: 'yoldaman' });
  notifyClient_(d.mijoz_id, '🚗 Kuryer yo\'lda! Ovqatingiz tez orada yetib keladi.');
  return deliveryCard_(d);
}

function markDelivered_(ctx, id, izoh) {
  var d = deliveryForActor_(ctx, id);
  if (d.holat !== 'rejada') fail('Bu yetkazish allaqachon belgilangan');
  var actor = actor_(ctx);
  update_('Yetkazishlar', d.id, { holat: 'yetkazildi', vaqt: nowIso_(), izoh: optStr_(izoh || d.izoh, 300) }, actor, { amal: 'yetkazildi' });
  notifyClient_(d.mijoz_id, '✅ Yetkazildi. Yoqimli ishtaha!');
  var order = get_('Buyurtmalar', d.buyurtma_id);
  if (order) finishOrderIfDone_(order, actor);
  return deliveryCard_(d);
}

/**
 * Yetkazib bo'lmadi (5.5, 8.3):
 *  - mijoz aybi: kun kuyadi, qaytarilmaydi;
 *  - bizning ayb: kun kuymaydi — Sozlamaga qarab keyinga qo'shiladi yoki keshbek bilan qoplanadi.
 */
function markFailed_(ctx, id, sabab, izoh) {
  var d = deliveryForActor_(ctx, id);
  if (d.holat !== 'rejada') fail('Bu yetkazish allaqachon belgilangan');
  if (!FAIL_REASONS[sabab]) fail('Sababni tanlang');
  var actor = actor_(ctx);
  update_('Yetkazishlar', d.id, { holat: 'yetkazilmadi', sabab: sabab, vaqt: nowIso_(), izoh: optStr_(izoh, 300) },
    actor, { amal: 'yetkazilmadi' });
  var order = mustGet_('Buyurtmalar', d.buyurtma_id, 'Buyurtma');
  var msg;
  if (FAIL_REASONS[sabab].ayb === 'biz') {
    if (setting_('bizning_xato_qoida') === 'keshbek') {
      var amount = money_(order.jami / order.kunlar);
      cbCredit_(order.mijoz_id, order.id, amount, 'tuzatish', 'Bizning xato: ' + d.sana + ' kun qoplandi', actor, { muhim: 'keshbek' });
      msg = '😔 Kechirasiz, bugungi yetkazish amalga oshmadi (' + FAIL_REASONS[sabab].nom +
        '). Kun qiymati ' + fmtMoney_(amount) + ' so\'m keshbek sifatida qaytarildi.';
      finishOrderIfDone_(order, actor);
    } else {
      var added = appendDay_(order, actor, 'Bizning xato ' + d.sana + ' o\'rniga');
      msg = '😔 Kechirasiz, bugungi yetkazish amalga oshmadi. Bu kun paket oxiriga qo\'shildi: ' + fmtDate_(added) + '.';
    }
  } else {
    msg = 'ℹ️ Bugun ovqatingizni yetkaza olmadik: ' + FAIL_REASONS[sabab].nom + '. Savollar bo\'lsa biz bilan bog\'laning.';
    finishOrderIfDone_(order, actor);
  }
  notifyClient_(d.mijoz_id, msg);
  return deliveryCard_(d);
}

/** Admin: kun bo'yicha yetkazishlar (hudud, kuryer, belgilanmaganlar). */
function deliveryBoard_(date) {
  var d = date || today_();
  var list = where_('Yetkazishlar', function (x) {
    return x.sana === d && (x.holat === 'rejada' || x.holat === 'yetkazildi' || x.holat === 'yetkazilmadi');
  });
  var cards = list.map(function (x) {
    var c = deliveryCard_(x);
    c.kuryer_id = x.kuryer_id;
    c.kuryer = courierName_(x.kuryer_id);
    c.buyurtma_id = x.buyurtma_id;
    return c;
  });
  return {
    sana: d,
    jami: cards.length,
    yetkazildi: cards.filter(function (c) { return c.holat === 'yetkazildi'; }).length,
    qoldi: cards.filter(function (c) { return c.holat === 'rejada'; }).length,
    biriktirilmagan: cards.filter(function (c) { return !c.kuryer_id && c.holat === 'rejada'; }).length,
    guruhlar: groupCards_(cards),
    kuryerlar: all_('Foydalanuvchilar').filter(function (u) { return u.faol && u.rol === ROLES.COURIER; })
      .map(function (u) { return { id: u.id, ism: u.ism }; }),
    hudud_kuryer: settingJson_('kuryer_hudud', {}),
    hududlar: settingJson_('hududlar', []),
    sabablar: Object.keys(FAIL_REASONS).map(function (k) { return { kod: k, nom: FAIL_REASONS[k].nom }; })
  };
}

/**
 * Kuryer biriktirish (7, 8.2-bo'lim):
 *  p.ids — tanlangan yetkazishlar; yoki p.hudud — shu hududdagi barcha (sana va keyingi kunlar).
 *  p.eslab_qol = true bo'lsa, hudud→kuryer saqlanadi va keyingi kunlarda o'zi takrorlanadi.
 */
function assignCourier_(ctx, p) {
  var kid = String(p.kuryer_id || '');
  if (kid) {
    var u = mustGet_('Foydalanuvchilar', kid, 'Kuryer');
    if (u.rol !== ROLES.COURIER || !u.faol) fail('Bu foydalanuvchi kuryer emas');
  }
  var actor = actor_(ctx);
  var targets;
  if (p.ids && p.ids.length) {
    targets = p.ids.map(function (id) { return mustGet_('Yetkazishlar', id, 'Yetkazish'); });
  } else {
    var from = reqDate_(p.sana || today_(), 'Sana');
    var hudud = reqStr_(p.hudud, 'Hudud');
    targets = where_('Yetkazishlar', function (x) {
      return x.hudud === hudud && x.holat === 'rejada' && (p.eslab_qol ? x.sana >= from : x.sana === from);
    });
    if (p.eslab_qol) {
      var map = settingJson_('kuryer_hudud', {});
      if (kid) map[hudud] = kid; else delete map[hudud];
      saveSettings_({ kuryer_hudud: JSON.stringify(map) }, actor);
    }
  }
  var n = 0;
  targets.forEach(function (x) {
    if (x.holat !== 'rejada' || x.kuryer_id === kid) return;
    update_('Yetkazishlar', x.id, { kuryer_id: kid }, actor, { audit: false });
    n++;
  });
  if (n) audit_(actor, 'kuryer_biriktirish', 'Yetkazishlar', targets.map(function (x) { return x.id; }).join(',').slice(0, 2000), '', { kuryer_id: kid, soni: n });
  return { biriktirildi: n };
}

/** Kesish vaqtida: biriktirilmagan ertangi yetkazishlarga xaritadan kuryer qo'yiladi. */
function autoAssign_(date) {
  var n = 0;
  where_('Yetkazishlar', function (x) { return x.sana === date && x.holat === 'rejada' && !x.kuryer_id; })
    .forEach(function (x) {
      var k = courierFor_(x.hudud);
      if (k) { update_('Yetkazishlar', x.id, { kuryer_id: k }, 'tizim', { audit: false }); n++; }
    });
  if (n) audit_('tizim', 'kuryer_avto', 'Yetkazishlar', date, '', { soni: n });
  return n;
}

/** Oshxona hisoboti: ertaga har ratsion turidan nechta kerak (8.2). */
function kitchenReport_(date) {
  var d = date || addDays_(today_(), 1);
  var list = where_('Yetkazishlar', function (x) { return x.sana === d && x.holat === 'rejada'; });
  var by = groupBy_(list, function (x) { return x.ratsion_id; });
  var rows = Object.keys(by).map(function (rid) {
    var r = get_('Ratsionlar', rid) || {};
    var hud = groupBy_(by[rid], function (x) { return x.hudud || 'Hududsiz'; });
    return {
      ratsion_id: rid, ratsion: r.nom || rid, kaloriya: r.kaloriya || '', soni: by[rid].length,
      hududlar: Object.keys(hud).map(function (h) { return { hudud: h, soni: hud[h].length }; })
    };
  }).sort(function (a, b) { return b.soni - a.soni; });
  var menu = where_('Menyu', function (m) { return m.sana === d && m.faol; }).map(function (m) {
    return { ratsion_id: m.ratsion_id, ratsion: (get_('Ratsionlar', m.ratsion_id) || {}).nom, taomlar: m.taomlar, kaloriya: m.kaloriya };
  });
  return { sana: d, jami: list.length, ratsionlar: rows, menyu: menu };
}

/** Kuryer uchun zaxira: ertangi ro'yxat matn ko'rinishida (11.4). */
function backupListText_(date) {
  var list = where_('Yetkazishlar', function (x) { return x.sana === date && x.holat === 'rejada'; });
  var lines = ['📋 ' + fmtDate_(date) + ' yetkazish ro\'yxati — jami ' + list.length + ' ta'];
  var byCourier = groupBy_(list, function (x) { return x.kuryer_id || ''; });
  Object.keys(byCourier).sort().forEach(function (kid) {
    lines.push('');
    lines.push('👤 Kuryer: ' + (courierName_(kid) || 'BIRIKTIRILMAGAN'));
    groupCards_(byCourier[kid].map(deliveryCard_)).forEach(function (g) {
      lines.push('📍 ' + g.hudud + ' (' + g.soni + ')');
      g.items.forEach(function (c, i) {
        var s = (i + 1) + '. ' + c.ism + ' ' + c.telefon + ' — ' + c.ratsion + '\n   ' + c.manzil;
        if (c.moljal) s += ' (mo\'ljal: ' + c.moljal + ')';
        if (c.google) s += '\n   ' + c.google;
        if (c.izoh) s += '\n   izoh: ' + c.izoh;
        lines.push(s);
      });
    });
  });
  return lines.join('\n');
}

/** Har kuryer uchun oylik yetkazishlar soni (8.4). */
function courierMonthStats_(ym) {
  var list = where_('Yetkazishlar', function (x) { return x.holat === 'yetkazildi' && monthOf_(x.sana) === ym; });
  var by = groupBy_(list, function (x) { return x.kuryer_id || ''; });
  return Object.keys(by).map(function (k) {
    return { kuryer_id: k, ism: courierName_(k) || 'Biriktirilmagan', soni: by[k].length };
  });
}
