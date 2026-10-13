/**
 * Keshbek (5.3-bo'lim).
 *
 * KeshbekHarakat varag'ida har bir harakat ishorali summa bilan yoziladi:
 *   hisoblandi (+), ishlatildi (−), muddati_otdi (−), qaytarildi (+),
 *   olib_qolindi (−, bekor qilishda), tuzatish (±, admin qo'lda, izoh majburiy).
 * Balans = shularning yig'indisi. Har bir musbat harakat — alohida "lot",
 * uning amal muddati bor; ishlatishda eng eskisi birinchi ketadi (FIFO).
 */

var CB_TYPES = {
  hisoblandi: 'Hisoblandi',
  ishlatildi: 'Ishlatildi',
  muddati_otdi: "Muddati o'tdi",
  qaytarildi: 'Qaytarildi',
  olib_qolindi: 'Bekor qilish tuzatmasi',
  tuzatish: "Qo'lda tuzatish"
};

/**
 * Harakatlarni xronologik o'tkazib, har bir lotning qoldig'ini hisoblaydi.
 * asOf sanasida muddati o'tgan lotlar balansga kirmaydi (job hali yozmagan bo'lsa ham).
 */
function cashbackLots_(events, asOf) {
  var evs = events.map(function (e, i) { return { e: e, i: i }; });
  evs.sort(function (a, b) {
    if (a.e.sana !== b.e.sana) return a.e.sana < b.e.sana ? -1 : 1;
    return a.i - b.i;
  });
  var lots = [];
  var byId = {};
  var deficit = 0;
  evs.forEach(function (x) {
    var e = x.e;
    var amt = Number(e.summa) || 0;
    if (amt > 0) {
      var lot = { id: e.id, sana: e.sana, tugash: e.tugash_sana || '9999-12-31', summa: amt, qoldiq: amt, tur: e.tur };
      // avvalgi qarzni (manfiy balans) yangi lotdan yopamiz
      var take = Math.min(deficit, lot.qoldiq);
      lot.qoldiq -= take;
      deficit -= take;
      lots.push(lot);
      byId[e.id] = lot;
      return;
    }
    var need = -amt;
    if (e.tur === 'muddati_otdi' && e.manba_id && byId[e.manba_id]) {
      var l = byId[e.manba_id];
      var t = Math.min(l.qoldiq, need);
      l.qoldiq -= t;
      return;
    }
    var open = lots.filter(function (l) { return l.qoldiq > 0 && l.tugash >= e.sana; })
      .sort(function (a, b) { return a.sana === b.sana ? (a.tugash < b.tugash ? -1 : 1) : (a.sana < b.sana ? -1 : 1); });
    for (var i = 0; i < open.length && need > 0; i++) {
      var tk = Math.min(open[i].qoldiq, need);
      open[i].qoldiq -= tk;
      need -= tk;
    }
    deficit += need;
  });
  var balance = 0;
  lots.forEach(function (l) { if (l.tugash >= asOf) balance += l.qoldiq; });
  return { lots: lots, balance: Math.max(0, balance - deficit), deficit: deficit };
}

function cashbackEvents_(clientId) {
  return where_('KeshbekHarakat', function (e) { return e.mijoz_id === clientId; });
}

function cashbackBalance_(clientId, asOf) {
  return cashbackLots_(cashbackEvents_(clientId), asOf || today_()).balance;
}

/** Mijoz uchun keshbek ekrani ma'lumoti (6.1, 5-ekran). */
function cashbackSummary_(clientId) {
  var t = today_();
  var warnDays = settingNum_('keshbek_eslatma_kun') || 7;
  var events = cashbackEvents_(clientId);
  var sim = cashbackLots_(events, t);
  var expiring = sim.lots.filter(function (l) {
    return l.qoldiq > 0 && l.tugash >= t && l.tugash !== '9999-12-31' && diffDays_(t, l.tugash) <= warnDays;
  }).map(function (l) { return { summa: l.qoldiq, tugash_sana: l.tugash }; });
  var nextExpiry = sim.lots.filter(function (l) { return l.qoldiq > 0 && l.tugash >= t && l.tugash !== '9999-12-31'; })
    .sort(function (a, b) { return a.tugash < b.tugash ? -1 : 1; })[0];
  return {
    balans: sim.balance,
    tugayotgan: expiring,
    keyingi_tugash: nextExpiry ? { summa: nextExpiry.qoldiq, tugash_sana: nextExpiry.tugash } : null,
    tarix: events.slice().reverse().map(function (e) {
      return {
        id: e.id, tur: e.tur, tur_nomi: CB_TYPES[e.tur] || e.tur, summa: e.summa, sana: e.sana,
        tugash_sana: e.tugash_sana, buyurtma_id: e.buyurtma_id, izoh: e.izoh
      };
    })
  };
}

function cbInsert_(row, actor, opts) {
  return insert_('KeshbekHarakat', Object.assign({ sana: today_(), kim: actor }, row), actor, opts);
}

/** Buyurtmada keshbek ishlatish (FIFO, yetarli balans tekshiriladi). Lock ichida chaqiriladi. */
function cbUse_(clientId, orderId, amount, actor) {
  if (amount <= 0) return null;
  var bal = cashbackBalance_(clientId);
  if (amount > bal) fail('Keshbek balansi yetarli emas');
  return cbInsert_({ mijoz_id: clientId, buyurtma_id: orderId, tur: 'ishlatildi', summa: -amount }, actor);
}

/** Yangi lot: qaytarish yoki musbat tuzatish (amal muddati — joriy qoidadan). */
function cbCredit_(clientId, orderId, amount, tur, izoh, actor, opts) {
  if (amount <= 0) return null;
  var rule = cashbackRule_(today_());
  return cbInsert_({
    mijoz_id: clientId, buyurtma_id: orderId || '', tur: tur, summa: amount,
    tugash_sana: addDays_(today_(), rule.amal_muddati_kun || 60), izoh: izoh || ''
  }, actor, opts);
}

/**
 * To'lov tasdiqlanganda keshbek hisoblanadi (faqat haqiqiy to'langan summadan).
 * To'lov id bo'yicha tekshiriladi — takror tasdiq ikki marta hisoblamaydi (11.2).
 */
function cbEarnForPayment_(order, payment, actor) {
  var exists = where_('KeshbekHarakat', function (e) {
    return e.tur === 'hisoblandi' && e.manba_id === payment.id;
  }).length > 0;
  if (exists) return null;
  if (!order.keshbek_foiz || payment.summa <= 0) return null;
  var cap = money_(order.keshbek_foiz / 100 * order.tolanadi);
  var already = sum_(where_('KeshbekHarakat', function (e) {
    return e.tur === 'hisoblandi' && e.buyurtma_id === order.id;
  }), function (e) { return e.summa; });
  var amount = Math.min(money_(order.keshbek_foiz / 100 * payment.summa), cap - already);
  if (amount <= 0) return null;
  return cbInsert_({
    mijoz_id: order.mijoz_id, buyurtma_id: order.id, tur: 'hisoblandi', summa: amount,
    tugash_sana: addDays_(today_(), order.keshbek_muddat_kun || 60), manba_id: payment.id,
    izoh: order.keshbek_foiz + '% × ' + payment.summa
  }, actor, { muhim: 'keshbek' });
}

/** Muddati o'tgan lotlarni yozib qo'yadi (kunlik job). */
function cbExpireAll_() {
  var t = today_();
  var byClient = groupBy_(all_('KeshbekHarakat'), function (e) { return e.mijoz_id; });
  var rows = [];
  Object.keys(byClient).forEach(function (cid) {
    var sim = cashbackLots_(byClient[cid], t);
    sim.lots.forEach(function (l) {
      if (l.qoldiq > 0 && l.tugash < t) {
        rows.push({
          mijoz_id: cid, buyurtma_id: '', tur: 'muddati_otdi', summa: -l.qoldiq, sana: addDays_(l.tugash, 1),
          manba_id: l.id, izoh: 'Lot ' + l.sana + ' muddati ' + l.tugash + ' da tugadi', kim: 'tizim'
        });
      }
    });
  });
  if (rows.length) insertMany_('KeshbekHarakat', rows, 'tizim', { amal: 'muddati_otdi' });
  return rows.length;
}

/** Barcha mijozlar keshbek balansi yig'indisi (10.1 keshbek majburiyati). */
function cbLiability_(asOf) {
  var t = asOf || today_();
  var byClient = groupBy_(all_('KeshbekHarakat'), function (e) { return e.mijoz_id; });
  var total = 0;
  Object.keys(byClient).forEach(function (cid) { total += cashbackLots_(byClient[cid], t).balance; });
  return total;
}
