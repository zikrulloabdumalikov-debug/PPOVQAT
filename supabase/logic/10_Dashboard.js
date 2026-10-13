/**
 * Dashboard (10-bo'lim). Faqat sheriklarga ochiq.
 *
 * Asosiy qoida: foyda YETKAZILGAN kunlar bo'yicha hisoblanadi, pul tushishi bo'yicha emas.
 * Daromad = har bir ishlatilgan kun uchun buyurtmaning kunlik daromadi (To'lanadi ÷ N).
 * "Ishlatilgan kun" = yetkazildi + mijoz aybi bilan kuygan kun (pul qaytarilmaydi).
 */

function periodRange_(p) {
  var t = today_();
  var ym = monthOf_(t);
  switch (p && p.davr) {
    case 'bugun': return { dan: t, gacha: t };
    case '7kun': return { dan: addDays_(t, -6), gacha: t };
    case 'otgan_oy': var pm = addMonths_(ym, -1); return { dan: monthStart_(pm), gacha: monthEnd_(pm) };
    case 'custom':
      var a = reqDate_(p.dan, 'Boshlanish', { min: '2020-01-01' }), b = reqDate_(p.gacha, 'Tugash', { min: '2020-01-01' });
      if (a > b) fail('Sana oralig\'i noto\'g\'ri');
      if (diffDays_(a, b) > 731) fail('Oraliq 2 yildan oshmasin');
      return { dan: a, gacha: b };
    default: return { dan: monthStart_(ym), gacha: t };
  }
}

/** Xarajatning [dan, gacha] davrga tushadigan qismi: doimiy va oylik — oy kunlariga teng bo'linadi. */
function expenseShare_(x, group, dan, gacha) {
  if (group === 'sherik') return 0;
  if (group === 'ozgaruvchan') return x.sana >= dan && x.sana <= gacha ? x.summa : 0;
  var ym = x.davr_oy || monthOf_(x.sana);
  var a = monthStart_(ym), b = monthEnd_(ym);
  var from = a > dan ? a : dan, to = b < gacha ? b : gacha;
  if (from > to) return 0;
  return x.summa * (diffDays_(from, to) + 1) / daysInMonth_(ym);
}

function planFor_(dayIndex, pairs) {
  if (!pairs || !pairs.length) return null;
  if (dayIndex <= pairs[0][0]) return pairs[0][1];
  for (var i = 1; i < pairs.length; i++) {
    if (dayIndex <= pairs[i][0]) {
      var p0 = pairs[i - 1], p1 = pairs[i];
      return round2_(p0[1] + (p1[1] - p0[1]) * (dayIndex - p0[0]) / (p1[0] - p0[0]));
    }
  }
  return pairs[pairs.length - 1][1];
}

/** Mijoz holati (7-bo'lim): yangi, faol, uxlayotgan, sovuyotgan, ketgan. */
function computeClientStatus_(orders, today, sleepDays, goneDays) {
  var paid = orders.filter(function (o) {
    return o.holat === 'faol' || o.holat === 'tugadi' || (o.holat === 'bekor' && o.kunlik_daromad > 0);
  });
  if (!paid.length) return 'yangi';
  if (orders.some(function (o) { return o.holat === 'faol' && o.tugash >= today; })) return 'faol';
  var lastEnd = paid.reduce(function (m, o) { return o.tugash > m ? o.tugash : m; }, '');
  var days = diffDays_(lastEnd, today);
  if (days <= 0) return 'faol';
  if (days <= sleepDays) return 'uxlayotgan';
  if (days > goneDays) return 'ketgan';
  return 'sovuyotgan';
}

var CLIENT_STATUS = {
  yangi: 'Yangi', faol: 'Faol', uxlayotgan: 'Uxlayotgan', sovuyotgan: 'Sovuyotgan', ketgan: 'Ketgan'
};

function updateClientStatus_(clientId) {
  var c = get_('Mijozlar', clientId);
  if (!c) return;
  var st = computeClientStatus_(where_('Buyurtmalar', function (o) { return o.mijoz_id === clientId; }), today_(),
    settingNum_('mijoz_uxlash_kun') || 14, settingNum_('mijoz_ketgan_kun') || 45);
  if (st !== c.holat) update_('Mijozlar', c.id, { holat: st }, 'tizim', { amal: 'holat_avto' });
}

function dashboardData_() {
  return {
    orders: all_('Buyurtmalar'),
    deliveries: all_('Yetkazishlar'),
    payments: all_('Tolovlar'),
    expenses: all_('Xarajatlar'),
    categories: all_('XarajatTurkum'),
    clients: all_('Mijozlar'),
    cbEvents: all_('KeshbekHarakat')
  };
}

/**
 * Barcha ko'rsatkichlar. data — jadvallar (testda qo'lda beriladi).
 * cfg: { today, off, sleepDays, goneDays, minMargin, shares, plan, launch }
 */
function computeDashboard_(data, dan, gacha, cfg) {
  var today = cfg.today;
  var orderById = indexBy_(data.orders, 'id');
  var catById = indexBy_(data.categories, 'id');
  var clientById = indexBy_(data.clients, 'id');
  var inP = function (s) { return s >= dan && s <= gacha; };
  var groupOf = function (x) { return (catById[x.turkum_id] || {}).guruh || 'ozgaruvchan'; };
  var validExp = data.expenses.filter(function (x) { return x.faol && x.holat === 'tasdiqlandi'; });
  var consumed = function (d) { return d.holat === 'yetkazildi' || (d.holat === 'yetkazilmadi' && isClientFault_(d.sabab)); };

  // --- 10.1 asosiy ---
  var periodDeliv = data.deliveries.filter(function (d) { return inP(d.sana); });
  var delivered = periodDeliv.filter(function (d) { return d.holat === 'yetkazildi'; });
  var revDays = periodDeliv.filter(consumed);
  var revenue = sum_(revDays, function (d) { return (orderById[d.buyurtma_id] || {}).kunlik_daromad; });

  var expense = 0, varCost = 0, byCat = {};
  validExp.forEach(function (x) {
    var g = groupOf(x);
    var s = expenseShare_(x, g, dan, gacha);
    if (!s) return;
    expense += s;
    var c = catById[x.turkum_id] || {};
    if (c.hissa) varCost += s;
    var key = c.nom || 'Boshqa';
    byCat[key] = (byCat[key] || 0) + s;
  });
  expense = money_(expense);
  revenue = money_(revenue);
  var profit = revenue - expense;
  var margin = revenue > 0 ? round2_(profit / revenue * 100) : null;

  var cashIn = sum_(data.payments.filter(function (p) {
    return (p.holat === 'tasdiqlandi' || p.holat === 'qaytarildi') && p.sana <= gacha;
  }), function (p) { return p.summa; });
  var cashOutExp = sum_(validExp.filter(function (x) { return x.sana <= gacha && groupOf(x) !== 'sherik'; }), function (x) { return x.summa; });
  var cashOutPartners = sum_(validExp.filter(function (x) { return x.sana <= gacha && groupOf(x) === 'sherik'; }), function (x) { return x.summa; });

  var delivByOrder = groupBy_(data.deliveries, function (d) { return d.buyurtma_id; });
  var paidByOrder = {};
  data.payments.forEach(function (p) {
    if (p.holat === 'tasdiqlandi' || p.holat === 'qaytarildi') paidByOrder[p.buyurtma_id] = (paidByOrder[p.buyurtma_id] || 0) + p.summa;
  });
  var prepaid = 0;
  data.orders.forEach(function (o) {
    if (o.holat === 'faol') {
      var left = (delivByOrder[o.id] || []).filter(function (d) { return d.holat === 'rejada'; }).length;
      prepaid += left * o.kunlik_daromad;
    } else if (o.holat === 'tolov_kutish') {
      prepaid += paidByOrder[o.id] || 0;
    }
  });

  var byClientCb = groupBy_(data.cbEvents, function (e) { return e.mijoz_id; });
  var cbLiab = 0;
  Object.keys(byClientCb).forEach(function (k) { cbLiab += cashbackLots_(byClientCb[k], today).balance; });

  var lastDay = gacha < today ? gacha : today;
  var workDays = dateRange_(dan, lastDay).filter(function (d) { return isWorkDay_(d, cfg.off); });
  var avgDaily = workDays.length ? round2_(delivered.length / workDays.length) : 0;

  // zararsizlik nuqtasi
  var avgRev = revDays.length ? revenue / revDays.length : 0;
  var varPer = delivered.length ? varCost / delivered.length : 0;
  var contribution = avgRev - varPer;
  var ym = monthOf_(gacha);
  var fixedFor = function (m) {
    return sum_(validExp.filter(function (x) {
      var g = groupOf(x);
      return (g === 'doimiy' || g === 'oylik') && (x.davr_oy || monthOf_(x.sana)) === m;
    }), function (x) { return x.summa; });
  };
  var fixedMonthly = fixedFor(ym);
  var fixedMonth = ym;
  if (!fixedMonthly) { fixedMonth = addMonths_(ym, -1); fixedMonthly = fixedFor(fixedMonth); }
  var monthWorkDays = dateRange_(monthStart_(ym), monthEnd_(ym)).filter(function (d) { return isWorkDay_(d, cfg.off); }).length;
  var breakeven = contribution > 0 && monthWorkDays ? round2_(fixedMonthly / (contribution * monthWorkDays)) : null;

  // --- 10.2 mijozlar ---
  var ordersByClient = groupBy_(data.orders, function (o) { return o.mijoz_id; });
  var isPaidOrder = function (o) {
    return o.holat === 'faol' || o.holat === 'tugadi' || (o.holat === 'bekor' && (paidByOrder[o.id] || 0) > 0);
  };
  var statusCounts = { yangi: 0, faol: 0, uxlayotgan: 0, sovuyotgan: 0, ketgan: 0 };
  var payingClients = [], repeatClients = [];
  var firstPaid = {};
  data.clients.forEach(function (c) {
    var os = ordersByClient[c.id] || [];
    var st = computeClientStatus_(os, today, cfg.sleepDays, cfg.goneDays);
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    var paid = os.filter(isPaidOrder);
    if (paid.length >= 1) payingClients.push(c.id);
    if (paid.length >= 2) repeatClients.push(c.id);
    if (paid.length) firstPaid[c.id] = paid.map(function (o) { return String(o.yaratilgan).slice(0, 10); }).sort()[0];
  });
  var newInPeriod = data.clients.filter(function (c) { return inP(c.royxatdan_sana); }).length;
  var newPaying = Object.keys(firstPaid).filter(function (k) { return inP(firstPaid[k]); });

  var periodOrders = data.orders.filter(function (o) { return isPaidOrder(o) && inP(String(o.yaratilgan).slice(0, 10)); });
  var pkgMix = {};
  periodOrders.forEach(function (o) {
    var k = o.kunlar;
    pkgMix[k] = pkgMix[k] || { kunlar: k, soni: 0, daromad: 0 };
    pkgMix[k].soni++;
    pkgMix[k].daromad += o.tolanadi;
  });

  var revByClient = {};
  revDays.forEach(function (d) {
    revByClient[d.mijoz_id] = (revByClient[d.mijoz_id] || 0) + ((orderById[d.buyurtma_id] || {}).kunlik_daromad || 0);
  });
  var adExp = validExp.filter(function (x) { return (catById[x.turkum_id] || {}).kod === 'reklama' && inP(x.sana); });
  var adTotal = sum_(adExp, function (x) { return x.summa; });
  var sources = {};
  data.clients.forEach(function (c) {
    var s = c.manba || 'Boshqa';
    sources[s] = sources[s] || { manba: s, mijozlar: 0, tolovchi: 0, qayta: 0, daromad: 0, yangi_tolovchi: 0, reklama: 0 };
    sources[s].mijozlar++;
    if (payingClients.indexOf(c.id) >= 0) sources[s].tolovchi++;
    if (repeatClients.indexOf(c.id) >= 0) sources[s].qayta++;
    if (newPaying.indexOf(c.id) >= 0) sources[s].yangi_tolovchi++;
    sources[s].daromad += revByClient[c.id] || 0;
  });
  adExp.forEach(function (x) {
    if (x.manba && sources[x.manba]) sources[x.manba].reklama += x.summa;
  });
  var sourceRows = Object.keys(sources).map(function (k) {
    var s = sources[k];
    s.daromad = money_(s.daromad);
    s.qayta_ulush = s.tolovchi ? round2_(s.qayta / s.tolovchi * 100) : 0;
    s.jalb_narxi = s.yangi_tolovchi && s.reklama ? money_(s.reklama / s.yangi_tolovchi) : null;
    return s;
  }).sort(function (a, b) { return b.mijozlar - a.mijozlar; });

  var totalNetCash = 0;
  Object.keys(paidByOrder).forEach(function (k) { totalNetCash += paidByOrder[k]; });

  var regions = {};
  delivered.forEach(function (d) { var h = d.hudud || 'Hududsiz'; regions[h] = (regions[h] || 0) + 1; });

  var discountGiven = sum_(periodOrders, function (o) { return o.kunlar * o.kunlik_narx - o.jami; });
  var cbUsed = sum_(periodOrders, function (o) { return o.keshbek_ishlatildi; });

  // --- 10.3 grafiklar ---
  var dailyMap = {};
  delivered.forEach(function (d) { dailyMap[d.sana] = (dailyMap[d.sana] || 0) + 1; });
  var daily = dateRange_(dan, lastDay).map(function (d) {
    var idx = cfg.launch ? diffDays_(cfg.launch, d) : null;
    return {
      sana: d, soni: dailyMap[d] || 0, ish_kuni: isWorkDay_(d, cfg.off),
      reja: idx !== null && idx >= 0 ? planFor_(idx, cfg.plan) : null
    };
  });
  var months = [];
  for (var i = 5; i >= 0; i--) {
    var m = addMonths_(ym, -i);
    var a = monthStart_(m), b = monthEnd_(m) < today ? monthEnd_(m) : today;
    if (a > b) continue;
    var rev = money_(sum_(data.deliveries.filter(function (d) { return d.sana >= a && d.sana <= b && consumed(d); }),
      function (d) { return (orderById[d.buyurtma_id] || {}).kunlik_daromad; }));
    var ex = money_(sum_(validExp, function (x) { return expenseShare_(x, groupOf(x), a, b); }));
    months.push({ oy: m, daromad: rev, xarajat: ex, foyda: rev - ex });
  }

  // --- 10.4 ogohlantirishlar ---
  var warnings = [];
  var lastExp = '';
  validExp.forEach(function (x) { if (!x.oylik_id && x.sana > lastExp) lastExp = x.sana; });
  if (!lastExp || diffDays_(lastExp, today) >= 3) {
    warnings.push({ tur: 'xarajat', matn: "Ma'lumot to'liq emas, foyda noto'g'ri bo'lishi mumkin: " +
      (lastExp ? diffDays_(lastExp, today) + ' kundan beri' : 'hali') + ' xarajat kiritilmagan.' });
  }
  if (margin !== null && margin < cfg.minMargin) {
    warnings.push({ tur: 'marja', matn: 'Foyda marjasi ' + margin + '% — belgilangan chegaradan (' + cfg.minMargin + '%) past.' });
  }
  if (breakeven !== null) {
    var recent = [];
    for (var dd = today; recent.length < 7 && diffDays_(dd, today) < 30; dd = addDays_(dd, -1)) {
      if (isWorkDay_(dd, cfg.off)) recent.push(dd);
    }
    var cnt = groupBy_(data.deliveries.filter(function (d) { return d.holat === 'yetkazildi'; }), function (d) { return d.sana; });
    if (recent.length === 7 && recent.every(function (d) { return (cnt[d] || []).length < breakeven; })) {
      warnings.push({ tur: 'zararsizlik', matn: 'Kunlik ratsion soni 7 kun ketma-ket zararsizlik nuqtasidan (' + breakeven + ') past.' });
    }
  }

  // --- 10.5 sheriklar ulushi ---
  var shares = (cfg.shares || []).map(function (s) {
    var taken = sum_(validExp.filter(function (x) {
      return groupOf(x) === 'sherik' && inP(x.sana) && x.sherik_id === s.ism;
    }), function (x) { return x.summa; });
    var share = money_(profit * s.foiz / 100);
    return { ism: s.ism, foiz: s.foiz, ulush: share, olingan: taken, qolgan: share - taken };
  });

  return {
    dan: dan, gacha: gacha,
    asosiy: {
      yetkazilgan: delivered.length,
      daromad_kunlar: revDays.length,
      daromad: revenue,
      xarajat: expense,
      foyda: profit,
      zarar: profit < 0,
      marja: margin,
      kassa: cashIn - cashOutExp - cashOutPartners,
      kassa_tafsilot: { tushum: cashIn, xarajat: cashOutExp, sherik_olgan: cashOutPartners },
      oldindan_olingan: money_(prepaid),
      keshbek_majburiyati: cbLiab,
      ortacha_kunlik: avgDaily,
      ish_kunlari: workDays.length,
      zararsizlik: breakeven,
      zararsizlik_tafsilot: {
        hissa: money_(contribution), ortacha_daromad: money_(avgRev), ozgaruvchan_bir_ratsion: money_(varPer),
        doimiy_oylik: fixedMonthly, doimiy_oy: fixedMonth, oy_ish_kunlari: monthWorkDays
      }
    },
    mijozlar: {
      holatlar: statusCounts,
      yangi_davrda: newInPeriod,
      tolovchi: payingClients.length,
      qayta_ulush: payingClients.length ? round2_(repeatClients.length / payingClients.length * 100) : 0,
      paketlar: Object.keys(pkgMix).map(function (k) { return pkgMix[k]; }).sort(function (a, b) { return a.kunlar - b.kunlar; }),
      manbalar: sourceRows,
      reklama: adTotal,
      yangi_tolovchi: newPaying.length,
      jalb_narxi: newPaying.length && adTotal ? money_(adTotal / newPaying.length) : null,
      ortacha_umr_daromadi: payingClients.length ? money_(totalNetCash / payingClients.length) : 0,
      hududlar: Object.keys(regions).map(function (h) { return { hudud: h, soni: regions[h] }; }).sort(function (a, b) { return b.soni - a.soni; }),
      chegirma: discountGiven,
      keshbek_ishlatildi: cbUsed,
      chegirma_ulush: revenue ? round2_(discountGiven / revenue * 100) : 0,
      keshbek_ulush: revenue ? round2_(cbUsed / revenue * 100) : 0
    },
    grafik: {
      kunlik: daily,
      oylik: months,
      xarajat_tarkibi: Object.keys(byCat).map(function (k) { return { turkum: k, summa: money_(byCat[k]) }; })
        .sort(function (a, b) { return b.summa - a.summa; })
    },
    ogohlantirishlar: warnings,
    sheriklar: shares
  };
}

function dashboard_(p) {
  var r = periodRange_(p || {});
  var cfg = {
    today: today_(),
    off: offDays_(),
    sleepDays: settingNum_('mijoz_uxlash_kun') || 14,
    goneDays: settingNum_('mijoz_ketgan_kun') || 45,
    minMargin: settingNum_('min_marja_foiz'),
    shares: settingJson_('sherik_ulushlari', []),
    plan: settingJson_('reja', []),
    launch: setting_('ishga_tushish_sana') || firstOrderDate_()
  };
  var res = computeDashboard_(dashboardData_(), r.dan, r.gacha, cfg);
  res.davr = (p && p.davr) || 'bu_oy';
  return res;
}

function firstOrderDate_() {
  var first = '';
  all_('Buyurtmalar').forEach(function (o) {
    var d = String(o.yaratilgan).slice(0, 10);
    if (d && (!first || d < first)) first = d;
  });
  return first;
}
