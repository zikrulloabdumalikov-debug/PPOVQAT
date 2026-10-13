/**
 * Narx, paket chegirmasi va keshbek qoidasi (5.1, 5.2, 5.6-bo'lim).
 *
 * Har biri "qachondan" sanasi bilan versiyalanadi: yangi qiymat = yangi qator,
 * eskisi o'chmaydi. Buyurtma yaratilgan kundagi versiya olinadi va buyurtmaga
 * snapshot qilib yoziladi.
 */

/** Versiyalar ichidan sana bo'yicha amaldagisini tanlaydi (eng kech "qachondan", keyin eng kech yaratilgan). */
function latestVersion_(rows, date) {
  var best = null;
  rows.forEach(function (r) {
    if (r.qachondan > date) return;
    if (!best || r.qachondan > best.qachondan ||
      (r.qachondan === best.qachondan && String(r.yaratilgan) >= String(best.yaratilgan))) best = r;
  });
  return best;
}

function priceRow_(ratsionId, date) {
  var v = latestVersion_(where_('Narxlar', function (r) { return r.ratsion_id === ratsionId; }), date);
  return v && v.faol ? v : null;
}

/** Sana bo'yicha amaldagi paketlar (har bir kunlar soni uchun bitta versiya). */
function activePackages_(date) {
  var byDays = groupBy_(all_('Paketlar'), function (p) { return p.kunlar; });
  var out = [];
  Object.keys(byDays).forEach(function (k) {
    var v = latestVersion_(byDays[k], date);
    if (v && v.faol) out.push(v);
  });
  return out.sort(function (a, b) { return a.kunlar - b.kunlar; });
}

function packageById_(id, date) {
  var p = mustGet_('Paketlar', id, 'Paket');
  var cur = latestVersion_(where_('Paketlar', function (r) { return r.kunlar === p.kunlar; }), date);
  if (!cur || !cur.faol) fail('Bu paket hozir sotuvda yo\'q');
  return cur; // har doim amaldagi versiya (eski id yuborilsa ham)
}

function cashbackRule_(date) {
  var r = latestVersion_(all_('KeshbekQoida'), date);
  return r || { id: '', foiz: 0, amal_muddati_kun: 60, min_summa: 0, max_ulush_foiz: 0 };
}

/**
 * Buyurtma summasi (5.1):
 *   Jami = N × P × (1 − D)
 *   To'lanadi = Jami − KeshbekIshlatildi
 *   YangiKeshbek = K × To'lanadi
 * Keshbek bilan to'lash chegarasi: Jami ning max_ulush_foiz %.
 */
function calcQuote_(p) {
  var N = p.kunlar, P = p.kunlik_narx, D = (p.chegirma_foiz || 0) / 100, K = (p.keshbek_foiz || 0) / 100;
  var jami = money_(N * P * (1 - D));
  var bezChegirma = N * P;
  var maxCb = Math.floor(jami * (p.max_ulush_foiz || 0) / 100);
  var used = p.use_cashback ? Math.max(0, Math.min(p.balans || 0, maxCb)) : 0;
  var tolanadi = jami - used;
  var yangi = tolanadi >= (p.min_summa || 0) ? money_(K * tolanadi) : 0;
  return {
    kunlar: N,
    kunlik_narx: P,
    chegirma_foiz: p.chegirma_foiz || 0,
    keshbek_foiz: p.keshbek_foiz || 0,
    bez_chegirma: bezChegirma,
    tejaladi: bezChegirma - jami,
    jami: jami,
    kuniga: money_(jami / N),
    keshbek_max: maxCb,
    keshbek_ishlatildi: used,
    tolanadi: tolanadi,
    yangi_keshbek: yangi
  };
}

/** Joriy versiyalar asosida taklif (sana = bugun yoki berilgan). */
function quoteFor_(ratsionId, paketId, opts) {
  var date = (opts && opts.date) || today_();
  var ratsion = mustGet_('Ratsionlar', ratsionId, 'Ratsion');
  if (!ratsion.faol) fail('Bu ratsion hozir sotuvda yo\'q');
  var price = priceRow_(ratsionId, date);
  if (!price) fail('Bu ratsion uchun narx belgilanmagan');
  var pkg = packageById_(paketId, date);
  var rule = cashbackRule_(date);
  var q = calcQuote_({
    kunlar: pkg.kunlar,
    kunlik_narx: price.kunlik_narx,
    chegirma_foiz: pkg.chegirma_foiz,
    keshbek_foiz: rule.foiz,
    max_ulush_foiz: rule.max_ulush_foiz,
    min_summa: rule.min_summa,
    use_cashback: !!(opts && opts.use_cashback),
    balans: (opts && opts.balans) || 0
  });
  q.ratsion_id = ratsionId;
  q.paket_id = pkg.id;
  q.keshbek_muddat_kun = rule.amal_muddati_kun;
  return q;
}

/** Barcha ratsion × paket kombinatsiyalari: "Chegirmalar" ekrani (6.1, 4-ekran). */
function catalog_(date) {
  var d = date || today_();
  var pkgs = activePackages_(d);
  var rule = cashbackRule_(d);
  var rations = all_('Ratsionlar').filter(function (r) { return r.faol; }).map(function (r) {
    var price = priceRow_(r.id, d);
    return {
      id: r.id, nom: r.nom, kaloriya: r.kaloriya, tavsif: r.tavsif,
      kunlik_narx: price ? price.kunlik_narx : 0,
      paketlar: price ? pkgs.map(function (p) {
        var q = calcQuote_({
          kunlar: p.kunlar, kunlik_narx: price.kunlik_narx, chegirma_foiz: p.chegirma_foiz,
          keshbek_foiz: rule.foiz, min_summa: rule.min_summa, max_ulush_foiz: rule.max_ulush_foiz
        });
        q.paket_id = p.id;
        q.nom = p.nom;
        return q;
      }) : []
    };
  }).filter(function (r) { return r.kunlik_narx > 0; });
  return {
    sana: d,
    ratsionlar: rations,
    paketlar: pkgs.map(function (p) { return pick_(p, ['id', 'nom', 'kunlar', 'chegirma_foiz']); }),
    keshbek: pick_(rule, ['foiz', 'amal_muddati_kun', 'min_summa', 'max_ulush_foiz'])
  };
}

// ---------- Yetkazish kunlari (5.4) ----------

/**
 * Eng erta boshlanish sanasi: kesish vaqtidan oldin bo'lsa ertaga, aks holda indinga.
 * Dam kuniga tushsa keyingi ish kuniga suriladi.
 */
function earliestStart_(off) {
  var o = off || offDays_();
  var t = today_();
  var before = hmToMin_(nowHM_()) < hmToMin_(setting_('kesish_vaqti'));
  var d = addDays_(t, before ? 1 : 2);
  var guard = 0;
  while (!isWorkDay_(d, o) && guard++ < 60) d = addDays_(d, 1);
  return d;
}

/** Ertangi kun hali o'zgartirilishi mumkinmi (pauza, bekor) — kesish vaqtigacha. */
function earliestChangeable_() {
  var before = hmToMin_(nowHM_()) < hmToMin_(setting_('kesish_vaqti'));
  return addDays_(today_(), before ? 1 : 2);
}

/** start dan boshlab N ta ish kuni (yakshanba va bayramlar o'tkazib yuboriladi). */
function deliveryDates_(start, n, off) {
  var o = off || offDays_();
  var out = [];
  var d = start, guard = 0;
  while (out.length < n && guard++ < n + 400) {
    if (isWorkDay_(d, o)) out.push(d);
    d = addDays_(d, 1);
  }
  return out;
}

function nextWorkDay_(after, off) {
  var d = addDays_(after, 1), guard = 0;
  while (!isWorkDay_(d, off) && guard++ < 60) d = addDays_(d, 1);
  return d;
}

// ---------- Marja qo'riqchisi (5.6) ----------

function rationCost_(r) {
  return (r.tannarx_ovqat || 0) + (r.tannarx_qadoq_yetkazish || 0);
}

/**
 * Chegirma va keshbekdan keyingi kunlik narx tannarxdan yuqori bo'lishi kerak:
 *   P × (1 − D) × (1 − K) > tannarx
 * Qaytaradi: ogohlantirishlar ro'yxati (bo'sh = hammasi joyida).
 */
function marginWarnings_(opts) {
  var date = opts.date || today_();
  var rations = opts.ratsion_id ? [mustGet_('Ratsionlar', opts.ratsion_id, 'Ratsion')]
    : all_('Ratsionlar').filter(function (r) { return r.faol; });
  var pkgs = activePackages_(date);
  if (opts.paket) {
    pkgs = pkgs.filter(function (p) { return p.kunlar !== opts.paket.kunlar; });
    if (opts.paket.faol !== false) pkgs.push(opts.paket);
  }
  var rule = cashbackRule_(date);
  var K = opts.keshbek_foiz !== undefined ? opts.keshbek_foiz : rule.foiz;
  var out = [];
  rations.forEach(function (r) {
    var P = opts.ratsion_id && opts.kunlik_narx ? opts.kunlik_narx : (priceRow_(r.id, date) || {}).kunlik_narx;
    var cost = opts.ratsion_id && opts.tannarx !== undefined ? opts.tannarx : rationCost_(r);
    if (!P || !cost) return;
    pkgs.forEach(function (p) {
      var net = P * (1 - p.chegirma_foiz / 100) * (1 - K / 100);
      if (net <= cost) {
        out.push({
          ratsion: r.nom, paket: p.nom || (p.kunlar + ' kun'), kunlar: p.kunlar,
          sof_narx: money_(net), tannarx: cost, farq: money_(net - cost),
          matn: r.nom + ', ' + (p.nom || p.kunlar + ' kun') + ': chegirma va keshbekdan keyin kuniga ' +
            money_(net) + ' so\'m, tannarx ' + cost + ' so\'m. Zarar!'
        });
      }
    });
  });
  return out;
}
