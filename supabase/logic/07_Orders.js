/**
 * Buyurtmalar: yaratish, to'lov, faollashtirish, pauza, bekor qilish (5, 6.2-bo'lim).
 *
 * Holatlar: tolov_kutish → faol → tugadi; tolov_kutish/faol → bekor.
 * Faol holatda har bir kun alohida pauza qilinishi mumkin.
 */

var ORDER_STATUS = {
  tolov_kutish: "To'lov kutilmoqda",
  faol: 'Faol',
  tugadi: 'Tugadi',
  bekor: 'Bekor qilindi'
};

var PAY_STATUS = {
  kutilmoqda: 'Kutilmoqda',
  qisman: "Qisman to'langan",
  tolangan: "To'langan",
  qaytarildi: 'Qaytarildi'
};

var DELIVERY_STATUS = {
  rejada: 'Rejada',
  yetkazildi: 'Yetkazildi',
  yetkazilmadi: "Yetkazib bo'lmadi",
  pauza: 'Pauza',
  bekor: 'Bekor'
};

function orderDeliveries_(orderId) {
  return where_('Yetkazishlar', function (d) { return d.buyurtma_id === orderId; })
    .sort(function (a, b) { return a.sana < b.sana ? -1 : a.sana > b.sana ? 1 : 0; });
}

function orderPayments_(orderId) {
  return where_('Tolovlar', function (p) { return p.buyurtma_id === orderId; });
}

/** Haqiqatan qo'lga tushgan pul: tasdiqlangan to'lovlar − qaytarilganlar. */
function paidCash_(orderId) {
  return sum_(orderPayments_(orderId).filter(function (p) {
    return p.holat === 'tasdiqlandi' || p.holat === 'qaytarildi';
  }), function (p) { return p.summa; });
}

function isClientFault_(sabab) {
  return !!(FAIL_REASONS[sabab] && FAIL_REASONS[sabab].ayb === 'mijoz');
}

/** Kun "ishlatilgan"mi: yetkazildi yoki mijoz aybi bilan kuydi. */
function isConsumed_(d) {
  return d.holat === 'yetkazildi' || (d.holat === 'yetkazilmadi' && isClientFault_(d.sabab));
}

function priceLockMs_() {
  return (settingNum_('narx_kafolat_soat') || 48) * 3600 * 1000;
}

// ---------- Yaratish ----------

/**
 * Yangi buyurtma. source: 'mijoz' (o'zi) yoki 'admin' (mijoz nomidan qo'lda).
 * p: { ratsion_id, kunlar (yoki eski paket_id), boshlanish, manzil_id, use_cashback, izoh }
 */
function createOrder_(ctx, client, p, source) {
  var ratsion = mustGet_('Ratsionlar', p.ratsion_id, 'Ratsion');
  var addr = mustGet_('Manzillar', p.manzil_id, 'Manzil');
  if (addr.mijoz_id !== client.id || !addr.faol) fail('Manzil topilmadi', 'topilmadi');
  var off = offDays_();
  var minStart = earliestStart_(off);
  var start = reqDate_(p.boshlanish || minStart, 'Boshlanish sanasi', { min: minStart, max: addDays_(today_(), 60) });
  if (!isWorkDay_(start, off)) fail('Bu kun dam olish kuni. Boshqa sanani tanlang');

  var balance = cashbackBalance_(client.id);
  var q = quoteFor_(ratsion.id, p, { use_cashback: !!p.use_cashback, balans: balance });
  var dates = deliveryDates_(start, q.kunlar, off);
  var actor = actor_(ctx);
  var order = insert_('Buyurtmalar', {
    mijoz_id: client.id,
    manzil_id: addr.id,
    ratsion_id: ratsion.id,
    paket_id: q.paket_id,
    kunlar: q.kunlar,
    boshlanish: dates[0],
    tugash: dates[dates.length - 1],
    kunlik_narx: q.kunlik_narx,
    chegirma_foiz: q.chegirma_foiz,
    keshbek_foiz: q.yangi_keshbek > 0 ? q.keshbek_foiz : 0, // min_summa dan past bo'lsa keshbek yo'q
    keshbek_muddat_kun: q.keshbek_muddat_kun,
    keshbek_ishlatildi: q.keshbek_ishlatildi,
    jami: q.jami,
    tolanadi: q.tolanadi,
    kunlik_daromad: round2_(q.tolanadi / q.kunlar),
    tolov_holati: q.tolanadi === 0 ? 'tolangan' : 'kutilmoqda',
    holat: 'tolov_kutish',
    kim_yaratdi: source,
    yaratuvchi_id: ctx.user ? ctx.user.id : '',
    yaratilgan: nowIso_(),
    narx_muddati: msToIso_(now_().getTime() + priceLockMs_()),
    tolov_usuli: p.tolov_usuli === 'naqd' ? 'naqd' : 'karta',
    izoh: optStr_(p.izoh, 500),
    qaytarilgan: 0,
    eslatma_yuborildi: false
  }, actor);
  if (q.keshbek_ishlatildi > 0) cbUse_(client.id, order.id, q.keshbek_ishlatildi, actor);
  // to'lanadigan summa 0 bo'lsa (hammasi keshbekdan) — darhol faollashadi
  if (order.tolanadi === 0) activateOrder_(order, actor);
  notifyStaff_('🆕 Yangi buyurtma (' + (source === 'mijoz' ? 'mijoz o\'zi' : 'admin') + '): ' +
    client.ism + ', ' + ratsion.nom + ', ' + order.kunlar + ' kun, ' + fmtMoney_(order.tolanadi) + ' so\'m');
  return order;
}

/**
 * 48 soatdan keyin to'lanmagan buyurtma eskiradi va joriy narx bilan qayta hisoblanadi (5.2).
 * Kutilayotgan to'lov (chek) bo'lsa — narx saqlanadi.
 */
function refreshStaleOrder_(order, actor) {
  if (order.holat !== 'tolov_kutish') return false;
  if (isoToMs_(order.narx_muddati) > now_().getTime()) return false;
  var hasPending = orderPayments_(order.id).some(function (p) { return p.holat === 'kutilmoqda' || p.holat === 'tasdiqlandi'; });
  if (hasPending) return false;
  var balance = cashbackBalance_(order.mijoz_id) + order.keshbek_ishlatildi; // band qilingan keshbek ham hisobga
  var q;
  try {
    q = quoteFor_(order.ratsion_id, order.kunlar, { use_cashback: order.keshbek_ishlatildi > 0, balans: balance });
  } catch (e) {
    return false; // ratsion/paket sotuvdan olingan — admin hal qiladi
  }
  var newUsed = Math.min(order.keshbek_ishlatildi, q.keshbek_ishlatildi);
  q.keshbek_ishlatildi = newUsed;
  q.tolanadi = q.jami - newUsed;
  var off = offDays_();
  var start = order.boshlanish < earliestStart_(off) ? earliestStart_(off) : order.boshlanish;
  var dates = deliveryDates_(start, q.kunlar, off);
  var oldTotal = order.tolanadi;
  if (order.keshbek_ishlatildi > newUsed) {
    cbCredit_(order.mijoz_id, order.id, order.keshbek_ishlatildi - newUsed, 'qaytarildi', 'Buyurtma qayta hisoblandi', actor);
  }
  update_('Buyurtmalar', order.id, {
    kunlik_narx: q.kunlik_narx, chegirma_foiz: q.chegirma_foiz,
    keshbek_foiz: q.yangi_keshbek > 0 ? q.keshbek_foiz : 0, keshbek_muddat_kun: q.keshbek_muddat_kun,
    paket_id: q.paket_id, jami: q.jami, keshbek_ishlatildi: newUsed, tolanadi: q.tolanadi,
    kunlik_daromad: round2_(q.tolanadi / q.kunlar), boshlanish: dates[0], tugash: dates[dates.length - 1],
    narx_muddati: msToIso_(now_().getTime() + priceLockMs_())
  }, actor, { amal: 'qayta_hisob', muhim: 'narx' });
  if (oldTotal !== q.tolanadi) {
    notifyClient_(order.mijoz_id, '♻️ Buyurtmangiz narx kafolati muddati o\'tdi va qayta hisoblandi. Yangi summa: ' +
      fmtMoney_(q.tolanadi) + ' so\'m.');
  }
  return true;
}

// ---------- To'lov ----------

/** Mijoz chek yuboradi yoki "naqd to'layman" deydi → to'lov kutilmoqda (6.2, 5-6-qadam). */
function submitPayment_(ctx, order, p) {
  if (order.holat !== 'tolov_kutish') fail('Bu buyurtma to\'lov kutmayapti');
  refreshStaleOrder_(order, actor_(ctx));
  var due = order.tolanadi - paidCash_(order.id) - sum_(orderPayments_(order.id).filter(function (x) {
    return x.holat === 'kutilmoqda';
  }), function (x) { return x.summa; });
  if (due <= 0) fail('Bu buyurtma uchun to\'lov allaqachon yuborilgan');
  var usul = p.usul === 'naqd' ? 'naqd' : 'karta';
  var chek = '';
  if (p.chek) chek = saveImage_(p.chek, 'chek_' + order.id);
  if (usul === 'karta' && !chek) fail('Chek rasmini yuboring');
  var pay = insert_('Tolovlar', {
    buyurtma_id: order.id, summa: due, usul: usul, sana: today_(), holat: 'kutilmoqda',
    chek_rasm: chek, izoh: optStr_(p.izoh, 300), yaratilgan: nowIso_()
  }, actor_(ctx));
  update_('Buyurtmalar', order.id, { tolov_usuli: usul }, actor_(ctx));
  var c = get_('Mijozlar', order.mijoz_id);
  notifyStaff_('💳 To\'lov tasdiq kutmoqda: ' + (c ? c.ism : '') + ', ' + fmtMoney_(due) + ' so\'m (' + usul + ')');
  return pay;
}

/** Admin/operator naqd yoki qisman to'lovni qo'lda kiritadi. */
function addPayment_(ctx, order, p) {
  if (order.holat === 'bekor') fail('Bekor qilingan buyurtma');
  var summa = reqMoney_(p.summa, 'Summa');
  var pay = insert_('Tolovlar', {
    buyurtma_id: order.id, summa: summa, usul: p.usul === 'karta' ? 'karta' : 'naqd', sana: today_(),
    holat: 'kutilmoqda', chek_rasm: p.chek ? saveImage_(p.chek, 'chek_' + order.id) : '',
    izoh: optStr_(p.izoh, 300), yaratilgan: nowIso_()
  }, actor_(ctx));
  return confirmPayment_(ctx, pay.id, { faollashtirish: p.faollashtirish });
}

/**
 * To'lovni tasdiqlash. Bir marta ishlaydi: takror bosilsa hech narsa o'zgarmaydi
 * va keshbek ikki marta hisoblanmaydi (11.2).
 */
function confirmPayment_(ctx, paymentId, opts) {
  var o = opts || {};
  var pay = mustGet_('Tolovlar', paymentId, 'To\'lov');
  if (pay.holat === 'tasdiqlandi') return { already: true, payment: pay };
  if (pay.holat !== 'kutilmoqda') fail('Bu to\'lov holati: ' + pay.holat);
  var order = mustGet_('Buyurtmalar', pay.buyurtma_id, 'Buyurtma');
  if (order.holat === 'bekor') fail('Buyurtma bekor qilingan');
  var actor = actor_(ctx);
  var patch = { holat: 'tasdiqlandi', tasdiqlagan: actor, sana: today_() };
  if (o.summa !== undefined && o.summa !== '' && o.summa !== null) patch.summa = reqMoney_(o.summa, 'Summa');
  update_('Tolovlar', pay.id, patch, actor, { amal: 'tolov_tasdiq', muhim: 'tolov' });
  cbEarnForPayment_(order, pay, actor);
  var paid = paidCash_(order.id);
  var ps = paid >= order.tolanadi ? 'tolangan' : 'qisman';
  update_('Buyurtmalar', order.id, { tolov_holati: ps }, actor);
  if (order.holat === 'tolov_kutish' && (ps === 'tolangan' || o.faollashtirish)) {
    activateOrder_(order, actor);
  } else {
    notifyClient_(order.mijoz_id, '✅ To\'lovingiz qabul qilindi: ' + fmtMoney_(pay.summa) + ' so\'m.');
  }
  return { already: false, payment: pay, order: order };
}

function rejectPayment_(ctx, paymentId, izoh) {
  var pay = mustGet_('Tolovlar', paymentId, 'To\'lov');
  if (pay.holat !== 'kutilmoqda') fail('Faqat kutilayotgan to\'lovni rad etish mumkin');
  var reason = reqStr_(izoh, 'Rad etish sababi', 300);
  update_('Tolovlar', pay.id, { holat: 'rad_etildi', izoh: reason, tasdiqlagan: actor_(ctx) }, actor_(ctx),
    { amal: 'tolov_rad', muhim: 'tolov' });
  var order = get_('Buyurtmalar', pay.buyurtma_id);
  if (order) notifyClient_(order.mijoz_id, '❗️ To\'lov tasdiqlanmadi: ' + reason + '. Iltimos, chekni qayta yuboring.');
  return pay;
}

// ---------- Faollashtirish ----------

function courierFor_(hudud) {
  var map = settingJson_('kuryer_hudud', {});
  if (hudud && map[hudud]) {
    var u = get_('Foydalanuvchilar', map[hudud]);
    if (u && u.faol && u.rol === ROLES.COURIER) return u.id;
  }
  var couriers = all_('Foydalanuvchilar').filter(function (u) { return u.faol && u.rol === ROLES.COURIER; });
  return couriers.length === 1 ? couriers[0].id : '';
}

/** To'lov tasdiqlanganda: buyurtma faol bo'ladi va N ta yetkazish kuni yaratiladi (5.4). */
function activateOrder_(order, actor) {
  if (order.holat !== 'tolov_kutish') return order;
  var off = offDays_();
  var minStart = earliestStart_(off);
  var start = order.boshlanish < minStart ? minStart : order.boshlanish;
  var dates = deliveryDates_(start, order.kunlar, off);
  var addr = get_('Manzillar', order.manzil_id) || {};
  var courier = courierFor_(addr.hudud);
  insertMany_('Yetkazishlar', dates.map(function (d) {
    return {
      buyurtma_id: order.id, mijoz_id: order.mijoz_id, sana: d, holat: 'rejada', sabab: '',
      kuryer_id: courier, hudud: addr.hudud || '', ratsion_id: order.ratsion_id, izoh: '', vaqt: '', yoldaman_vaqt: ''
    };
  }), actor, { amal: 'yetkazish_yaratish' });
  update_('Buyurtmalar', order.id, {
    holat: 'faol', boshlanish: dates[0], tugash: dates[dates.length - 1],
    kunlik_daromad: round2_(order.tolanadi / order.kunlar)
  }, actor, { amal: 'faollashtirish' });
  updateClientStatus_(order.mijoz_id);
  notifyClient_(order.mijoz_id, '✅ Buyurtmangiz tasdiqlandi, birinchi yetkazish: ' + fmtDate_(dates[0]) +
    '. Oxirgi kun: ' + fmtDate_(dates[dates.length - 1]) + '.');
  return order;
}

/** Tugash sanasi = oxirgi (bekor/pauza bo'lmagan) yetkazish kuni (5.4). */
function recomputeEnd_(order, actor) {
  var ds = orderDeliveries_(order.id).filter(function (d) { return d.holat !== 'bekor' && d.holat !== 'pauza'; });
  if (!ds.length) return order;
  update_('Buyurtmalar', order.id, { tugash: ds[ds.length - 1].sana }, actor);
  return order;
}

/** Paket oxiriga bitta ish kuni qo'shadi (pauza yoki bizning ayb bilan yetkazilmagan kun uchun). */
function appendDay_(order, actor, izoh) {
  var ds = orderDeliveries_(order.id).filter(function (d) { return d.holat !== 'bekor'; });
  var last = ds.length ? ds[ds.length - 1].sana : order.boshlanish;
  var minD = earliestStart_();
  var next = nextWorkDay_(last < minD ? addDays_(minD, -1) : last);
  if (next < minD) next = minD;
  var addr = get_('Manzillar', order.manzil_id) || {};
  var tmpl = ds[ds.length - 1] || {};
  insert_('Yetkazishlar', {
    buyurtma_id: order.id, mijoz_id: order.mijoz_id, sana: next, holat: 'rejada', sabab: '',
    kuryer_id: tmpl.kuryer_id || courierFor_(addr.hudud), hudud: addr.hudud || tmpl.hudud || '',
    ratsion_id: order.ratsion_id, izoh: izoh || '', vaqt: '', yoldaman_vaqt: ''
  }, actor, { amal: 'kun_qoshish' });
  if (order.holat === 'tugadi') update_('Buyurtmalar', order.id, { holat: 'faol' }, actor);
  recomputeEnd_(order, actor);
  return next;
}

// ---------- Pauza (5.5) ----------

function pauseLimit_(order) {
  return Math.floor(order.kunlar * (settingNum_('pauza_foiz') || 0) / 100);
}

function pauseDay_(ctx, order, deliveryId, byStaff) {
  if (order.holat !== 'faol') fail('Faqat faol buyurtmada pauza qilish mumkin');
  var d = mustGet_('Yetkazishlar', deliveryId, 'Kun');
  if (d.buyurtma_id !== order.id) fail('Kun topilmadi', 'topilmadi');
  if (d.holat !== 'rejada') fail('Bu kunni pauza qilib bo\'lmaydi');
  var minD = byStaff ? today_() : earliestChangeable_();
  if (d.sana < minD) fail('Bu kun uchun kesish vaqti o\'tdi (' + setting_('kesish_vaqti') + ')');
  var paused = orderDeliveries_(order.id).filter(function (x) { return x.holat === 'pauza'; }).length;
  var limit = pauseLimit_(order);
  if (paused + 1 > limit) fail('Pauza chegarasi: bu paketda ko\'pi bilan ' + limit + ' kun pauza qilish mumkin');
  var actor = actor_(ctx);
  update_('Yetkazishlar', d.id, { holat: 'pauza' }, actor, { amal: 'pauza' });
  var added = appendDay_(order, actor, 'Pauza ' + d.sana + ' o\'rniga');
  return { pauza: d.sana, qoshildi: added, tugash: order.tugash };
}

function unpauseDay_(ctx, order, deliveryId, byStaff) {
  if (order.holat !== 'faol') fail('Faqat faol buyurtma');
  var d = mustGet_('Yetkazishlar', deliveryId, 'Kun');
  if (d.buyurtma_id !== order.id || d.holat !== 'pauza') fail('Bu kun pauzada emas');
  var minD = byStaff ? today_() : earliestChangeable_();
  if (d.sana < minD) fail('Bu kun uchun kesish vaqti o\'tdi');
  var actor = actor_(ctx);
  // oxirgi rejadagi kunni olib tashlaymiz (o'chirmaymiz — bekor qilamiz)
  var tail = orderDeliveries_(order.id).filter(function (x) { return x.holat === 'rejada' && x.sana >= minD; });
  if (!tail.length) fail('Pauzani bekor qilib bo\'lmaydi');
  var lastOne = tail[tail.length - 1];
  update_('Yetkazishlar', d.id, { holat: 'rejada' }, actor, { amal: 'pauza_bekor' });
  if (lastOne.sana > d.sana || lastOne.id !== d.id) {
    update_('Yetkazishlar', lastOne.id, { holat: 'bekor', sabab: 'pauza_bekor' }, actor, { amal: 'pauza_bekor' });
  }
  recomputeEnd_(order, actor);
  return { tugash: order.tugash };
}

// ---------- Bekor qilish (5.5) ----------

/** Paket chegirmasi: ishlatilgan kunlar sonidan oshmaydigan eng katta paket (buyurtma sanasidagi versiya). */
function discountForDays_(days, date) {
  var pkg = packageForDays_(days, date);
  return pkg ? pkg.chegirma_foiz : 0;
}

/**
 * Bekor qilish hisob-kitobi:
 *  - boshlanishidan oldin: to'liq qaytariladi (pul + ishlatilgan keshbek);
 *  - boshlangandan keyin: yetkazilmagan kunlar qaytariladi, lekin chegirma ishlatilgan
 *    kunlar soni bo'yicha qayta hisoblanadi (24 kunlik olib 6 kunda to'xtatsa — 6 kunlik narx).
 *  Avval keshbek, keyin pul qaytariladi.
 */
function cancelPreview_(order) {
  if (order.holat === 'bekor') fail('Buyurtma allaqachon bekor qilingan');
  if (order.holat === 'tugadi') fail('Tugagan buyurtmani bekor qilib bo\'lmaydi');
  var minD = earliestChangeable_();
  var ds = orderDeliveries_(order.id);
  var consumed = ds.filter(function (d) {
    return isConsumed_(d) || (d.holat === 'rejada' && d.sana < minD);
  });
  var toCancel = ds.filter(function (d) { return d.holat === 'rejada' && d.sana >= minD; });
  var paid = paidCash_(order.id);
  var valuePaid = paid + order.keshbek_ishlatildi;
  var n = consumed.length;
  var retained = 0, d2 = 0;
  if (n > 0) {
    d2 = discountForDays_(n, String(order.yaratilgan).slice(0, 10));
    retained = Math.min(order.jami, money_(n * order.kunlik_narx * (1 - d2 / 100)));
  }
  var refundTotal = Math.max(0, valuePaid - retained);
  var cbBack = Math.min(order.keshbek_ishlatildi, refundTotal);
  var cashBack = Math.min(paid, refundTotal - cbBack);
  var keptCash = paid - cashBack;
  var earned = sum_(where_('KeshbekHarakat', function (e) {
    return e.tur === 'hisoblandi' && e.buyurtma_id === order.id;
  }), function (e) { return e.summa; });
  var shouldEarn = money_(order.keshbek_foiz / 100 * keptCash);
  return {
    buyurtma_id: order.id,
    ishlatilgan_kunlar: n,
    bekor_kunlar: toCancel.length,
    qayta_chegirma_foiz: d2,
    ushlab_qolinadi: retained,
    tolangan: paid,
    keshbek_ishlatilgan: order.keshbek_ishlatildi,
    qaytariladigan_pul: cashBack,
    qaytariladigan_keshbek: cbBack,
    keshbek_olib_qolinadi: Math.max(0, earned - shouldEarn),
    kunlik_daromad: n > 0 ? round2_(keptCash / n) : 0,
    _cancel: toCancel.map(function (d) { return d.id; }),
    _lastConsumed: consumed.length ? consumed[consumed.length - 1].sana : ''
  };
}

function cancelOrder_(ctx, order, reason) {
  var pv = cancelPreview_(order);
  var actor = actor_(ctx);
  pv._cancel.forEach(function (id) {
    update_('Yetkazishlar', id, { holat: 'bekor', sabab: 'buyurtma_bekor' }, actor, { audit: false });
  });
  if (pv._cancel.length) audit_(actor, 'yetkazish_bekor', 'Yetkazishlar', pv._cancel.join(','), '', { soni: pv._cancel.length });
  // kutilayotgan to'lovlar rad etiladi
  orderPayments_(order.id).forEach(function (p) {
    if (p.holat === 'kutilmoqda') update_('Tolovlar', p.id, { holat: 'rad_etildi', izoh: 'Buyurtma bekor qilindi' }, actor);
  });
  if (pv.qaytariladigan_pul > 0) {
    insert_('Tolovlar', {
      buyurtma_id: order.id, summa: -pv.qaytariladigan_pul, usul: order.tolov_usuli || 'naqd', sana: today_(),
      holat: 'qaytarildi', tasdiqlagan: actor, izoh: 'Bekor qilish: qaytarildi', yaratilgan: nowIso_()
    }, actor, { muhim: 'tolov' });
  }
  if (pv.qaytariladigan_keshbek > 0) {
    cbCredit_(order.mijoz_id, order.id, pv.qaytariladigan_keshbek, 'qaytarildi', 'Bekor qilingan buyurtma', actor);
  }
  if (pv.keshbek_olib_qolinadi > 0) {
    cbInsert_({
      mijoz_id: order.mijoz_id, buyurtma_id: order.id, tur: 'olib_qolindi', summa: -pv.keshbek_olib_qolinadi,
      izoh: 'Bekor qilish: qaytarilgan pul uchun keshbek'
    }, actor, { muhim: 'keshbek' });
  }
  var patch = {
    holat: 'bekor',
    qaytarilgan: pv.qaytariladigan_pul,
    izoh: (order.izoh ? order.izoh + ' | ' : '') + 'Bekor: ' + optStr_(reason, 200)
  };
  if (pv.qaytariladigan_pul > 0) patch.tolov_holati = 'qaytarildi';
  if (pv.ishlatilgan_kunlar > 0) {
    patch.kunlik_daromad = pv.kunlik_daromad;
    patch.tugash = pv._lastConsumed > order.tugash ? order.tugash : pv._lastConsumed;
  }
  update_('Buyurtmalar', order.id, patch, actor, { amal: 'bekor_qilish', muhim: 'tolov' });
  updateClientStatus_(order.mijoz_id);
  notifyClient_(order.mijoz_id, '❌ Buyurtmangiz bekor qilindi.' +
    (pv.qaytariladigan_pul ? ' Qaytariladigan summa: ' + fmtMoney_(pv.qaytariladigan_pul) + ' so\'m.' : '') +
    (pv.qaytariladigan_keshbek ? ' Keshbekka qaytdi: ' + fmtMoney_(pv.qaytariladigan_keshbek) + ' so\'m.' : ''));
  delete pv._cancel;
  delete pv._lastConsumed;
  return pv;
}

/** Rejada kun qolmagan faol buyurtmalar "tugadi" bo'ladi. */
function finishOrderIfDone_(order, actor) {
  if (order.holat !== 'faol') return false;
  var left = orderDeliveries_(order.id).some(function (d) { return d.holat === 'rejada'; });
  if (left) return false;
  update_('Buyurtmalar', order.id, { holat: 'tugadi' }, actor || 'tizim', { amal: 'tugadi' });
  updateClientStatus_(order.mijoz_id);
  return true;
}

// ---------- Ko'rinish ----------

function remainingDays_(orderId) {
  return orderDeliveries_(orderId).filter(function (d) { return d.holat === 'rejada'; }).length;
}

/** Buyurtma ko'rinishi. forClient = true bo'lsa — faqat mijozga kerakli maydonlar. */
function orderView_(order, forClient) {
  var ratsion = get_('Ratsionlar', order.ratsion_id) || {};
  var addr = get_('Manzillar', order.manzil_id) || {};
  var minD = earliestChangeable_();
  var ds = orderDeliveries_(order.id).filter(function (d) { return d.holat !== 'bekor'; });
  var paused = ds.filter(function (d) { return d.holat === 'pauza'; }).length;
  var limit = pauseLimit_(order);
  var v = {
    id: order.id,
    ratsion: ratsion.nom || '',
    ratsion_id: order.ratsion_id,
    kunlar: order.kunlar,
    boshlanish: order.boshlanish,
    tugash: order.tugash,
    holat: order.holat,
    holat_nomi: ORDER_STATUS[order.holat] || order.holat,
    tolov_holati: order.tolov_holati,
    tolov_holati_nomi: PAY_STATUS[order.tolov_holati] || order.tolov_holati,
    kunlik_narx: order.kunlik_narx,
    chegirma_foiz: order.chegirma_foiz,
    jami: order.jami,
    keshbek_ishlatildi: order.keshbek_ishlatildi,
    tolanadi: order.tolanadi,
    tolangan: paidCash_(order.id),
    qaytarilgan: order.qaytarilgan,
    yaratilgan: order.yaratilgan,
    narx_muddati: order.narx_muddati,
    tolov_usuli: order.tolov_usuli,
    manzil: { id: addr.id, nom: addr.nom, matn: addr.matn, hudud: addr.hudud },
    qolgan_kun: ds.filter(function (d) { return d.holat === 'rejada'; }).length,
    yetkazildi: ds.filter(function (d) { return d.holat === 'yetkazildi'; }).length,
    pauza: paused,
    pauza_limit: limit,
    kunlar_jadvali: ds.map(function (d) {
      return {
        id: d.id, sana: d.sana, holat: d.holat, holat_nomi: DELIVERY_STATUS[d.holat] || d.holat,
        sabab: d.sabab ? ((FAIL_REASONS[d.sabab] || {}).nom || d.sabab) : '',
        pauza_mumkin: order.holat === 'faol' && d.holat === 'rejada' && d.sana >= minD && paused < limit,
        pauza_bekor_mumkin: order.holat === 'faol' && d.holat === 'pauza' && d.sana >= minD
      };
    }),
    tolovlar: orderPayments_(order.id).map(function (p) {
      var x = { id: p.id, summa: p.summa, usul: p.usul, sana: p.sana, holat: p.holat, izoh: p.izoh, chek: !!p.chek_rasm };
      return x;
    })
  };
  if (!forClient) {
    var c = get_('Mijozlar', order.mijoz_id) || {};
    v.mijoz = { id: c.id, ism: c.ism, telefon: c.telefon, manba: c.manba };
    v.kim_yaratdi = order.kim_yaratdi;
    v.izoh = order.izoh;
    v.keshbek_foiz = order.keshbek_foiz;
    v.manzil.lat = addr.lat;
    v.manzil.lng = addr.lng;
    v.manzil.moljal = addr.moljal;
    v.kunlar_jadvali.forEach(function (k) { k.pauza_mumkin = k.pauza_mumkin || false; });
    v.tolovlar = orderPayments_(order.id).map(function (p) {
      return {
        id: p.id, summa: p.summa, usul: p.usul, sana: p.sana, holat: p.holat, izoh: p.izoh,
        chek: !!p.chek_rasm, tasdiqlagan: p.tasdiqlagan
      };
    });
  }
  return v;
}
