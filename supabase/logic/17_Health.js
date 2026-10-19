/**
 * Kaloriya tavsiyasi, vazn prognozi va vazn statistikasi.
 *
 * Mijoz jinsi, yoshi, bo'yi, vazni, maqsadi (va usuli) hamda turmush tarzini kiritadi →
 *   1) kunlik sarf: Mifflin–San Jeor formulasi × turmush tarzi koeffitsienti;
 *   2) ozish/vazn olishda usul (yengil/o'rtacha/tez) haftasiga necha kg o'zgarishni belgilaydi:
 *      1 kg ≈ 7700 kkal, ya'ni haftasiga 0,5 kg uchun kuniga ~550 kkal kam (yoki ko'p);
 *   3) ozishda kuniga erkak 1500 / ayol 1200 kkal dan kam tavsiya qilinmaydi (sur'at shunga moslanadi);
 *   4) unga eng yaqin kaloriyali ratsion tavsiya qilinadi va oylar bo'yicha vazn prognozi chiziladi.
 * Vazn har o'zgarganda VaznTarix ga yoziladi (bir kunda bitta yozuv), har 15 kunda bot qayta so'raydi.
 */

var GOALS = {
  ozish: { nom: 'Ozmoqchiman', ishora: -1 },
  saqlash: { nom: 'Vaznimni saqlamoqchiman', ishora: 0 },
  vazn_olish: { nom: 'Vazn olmoqchiman', ishora: 1 }
};

/** Usul = haftasiga necha kg o'zgarish. */
var METHODS = {
  yengil: { nom: 'Yengil', kg: 0.25 },
  ortacha: { nom: 'O\'rtacha', kg: 0.5 },
  tez: { nom: 'Tez', kg: 0.75 }
};

var ACTIVITY = {
  ofis: { nom: 'Kam harakat (ofisda o\'tirib ishlayman)', k: 1.2 },
  ortacha: { nom: 'O\'rtacha (haftada 1–3 marta mashq)', k: 1.375 },
  sport: { nom: 'Faol (haftada 4+ marta shug\'ullanaman)', k: 1.55 }
};

var KCAL_PER_KG = 7700;
var MIN_KCAL = { erkak: 1500, ayol: 1200 };
var MIN_BMI = 18.5;

function hasMethod_(maqsad) { return maqsad === 'ozish' || maqsad === 'vazn_olish'; }

/** Mijoz usuli (eski yozuvlarda bo'lmasa — o'rtacha). */
function methodOf_(c) {
  if (!hasMethod_(c.maqsad)) return '';
  return METHODS[c.usul] ? c.usul : 'ortacha';
}

function methodLabel_(maqsad, key) {
  var m = METHODS[key];
  if (!m || !hasMethod_(maqsad)) return '';
  var kcal = Math.round(m.kg * KCAL_PER_KG / 7 / 5) * 5;
  return m.nom + ' — haftasiga ~' + String(m.kg).replace('.', ',') + ' kg (kuniga ~' + kcal + ' kkal ' +
    (maqsad === 'ozish' ? 'kam' : 'ko\'p') + ')';
}

function goalLabel_(c) {
  var g = GOALS[c.maqsad];
  if (!g) return '';
  var m = methodOf_(c);
  return g.nom + (m ? ' (' + METHODS[m].nom.toLowerCase() + ')' : '');
}

function healthComplete_(c) {
  return !!(c.jins && c.tugilgan_yil && c.boy && c.vazn && GOALS[c.maqsad] && ACTIVITY[c.faollik]);
}

/**
 * Kunlik reja: { sarf (kunlik sarf), kkal (tavsiya), hafta_kg (+/−), chegaralandi }.
 * hafta_kg — kkal farqidan kelib chiqadi, shuning uchun chegara qo'llansa sur'at ham kamayadi.
 */
function dailyPlan_(c) {
  var age = Number(today_().slice(0, 4)) - c.tugilgan_yil;
  var bmr = 10 * c.vazn + 6.25 * c.boy - 5 * age + (c.jins === 'erkak' ? 5 : -161);
  var sarf = bmr * ACTIVITY[c.faollik].k;
  var g = GOALS[c.maqsad];
  var m = methodOf_(c);
  var kcal = sarf + (m ? g.ishora * METHODS[m].kg * KCAL_PER_KG / 7 : 0);
  var min = MIN_KCAL[c.jins] || 1200;
  var capped = false;
  if (c.maqsad === 'ozish' && kcal < min) { kcal = min; capped = true; }
  var week = (kcal - sarf) * 7 / KCAL_PER_KG;
  if (c.maqsad === 'ozish' && week > 0) week = 0;
  return {
    sarf: Math.round(sarf / 10) * 10,
    kkal: Math.round(kcal / 10) * 10,
    hafta_kg: Math.round(week * 100) / 100,
    chegaralandi: capped,
    min_kkal: min
  };
}

/** Kunlik kaloriya tavsiyasi (kkal). */
function dailyKcal_(c) {
  return dailyPlan_(c).kkal;
}

/** Sanaga n oy qo'shish (31-yanvar + 1 oy = 28/29-fevral). */
function addMonthsDate_(date, n) {
  var ym = addMonths_(date.slice(0, 7), n);
  var day = Math.min(Number(date.slice(8, 10)), daysInMonth_(ym));
  return ym + '-' + ('0' + day).slice(-2);
}

/**
 * Vazn prognozi: bugundan boshlab haftalik nuqtalar (6 oygacha) va 1/2/3/6 oylik natijalar.
 * Ozishda prognoz sog'lom chegaradan (BMI 18,5) pastga tushmaydi.
 */
function weightForecast_(c, plan) {
  var start = today_();
  var w0 = c.vazn;
  var floor = c.maqsad === 'ozish' ? Math.round(MIN_BMI * Math.pow(c.boy / 100, 2) * 10) / 10 : 0;
  var at = function (date) {
    var w = w0 + plan.hafta_kg * diffDays_(start, date) / 7;
    if (floor && w < floor) w = Math.min(w0, floor);
    return Math.round(w * 10) / 10;
  };
  var end = addMonthsDate_(start, 6);
  var points = [];
  for (var d = start; d < end; d = addDays_(d, 7)) points.push({ sana: d, vazn: at(d) });
  points.push({ sana: end, vazn: at(end) });
  return {
    boshlanish: start,
    vazn: w0,
    chegara_vazn: floor,
    nuqtalar: points,
    oylar: [1, 2, 3, 6].map(function (n) {
      var d2 = addMonthsDate_(start, n);
      var v = at(d2);
      return { oy: n, sana: d2, vazn: v, ozgarish: Math.round((v - w0) * 10) / 10 };
    })
  };
}

function bmiOf_(c) {
  if (!c.vazn || !c.boy) return 0;
  return Math.round(c.vazn / Math.pow(c.boy / 100, 2) * 10) / 10;
}

/** Ehtiyojga eng yaqin kaloriyali faol (narxi bor) ratsion. */
function recommendRation_(kcal) {
  var d = today_();
  var best = null;
  all_('Ratsionlar').forEach(function (r) {
    if (!r.faol) return;
    var k = kcalOf_(r.kaloriya);
    var price = priceRow_(r.id, d);
    if (!k || !price) return;
    var diff = Math.abs(k - kcal);
    if (!best || diff < best.diff) best = { diff: diff, r: r, kunlik_narx: price.kunlik_narx };
  });
  if (!best) return null;
  return {
    ratsion_id: best.r.id, ratsion: best.r.nom, kaloriya: best.r.kaloriya,
    tavsif: best.r.tavsif, kunlik_narx: best.kunlik_narx
  };
}

function weightHistory_(clientId) {
  return where_('VaznTarix', function (w) { return w.mijoz_id === clientId; })
    .sort(function (a, b) { return a.sana < b.sana ? -1 : a.sana > b.sana ? 1 : 0; });
}

/** Vazn yana so'ralishi kerakmi (oxirgi o'lchovdan N kun o'tgan). */
function weightDue_(c, hist) {
  if (!c.vazn) return false;
  var h = hist || weightHistory_(c.id);
  var last = h.length ? h[h.length - 1].sana : '';
  var n = settingNum_('vazn_sorash_kun') || 15;
  return !last || diffDays_(last, today_()) >= n;
}

function weightSummary_(hist) {
  if (!hist.length) return null;
  var first = hist[0], last = hist[hist.length - 1];
  return {
    boshlangich: first.vazn, boshlangich_sana: first.sana,
    joriy: last.vazn, joriy_sana: last.sana,
    ozgarish: round2_(last.vazn - first.vazn)
  };
}

function healthView_(c) {
  var hist = weightHistory_(c.id);
  var done = healthComplete_(c);
  var plan = done ? dailyPlan_(c) : null;
  var bmi = bmiOf_(c);
  var warn = '';
  if (done && c.maqsad === 'ozish' && bmi && bmi < MIN_BMI) {
    warn = 'Vazningiz me\'yorning pastki chegarasida (tana massasi indeksi ' + bmi + '). Ozish tavsiya qilinmaydi — "Vaznimni saqlamoqchiman" ni tanlang yoki shifokor bilan maslahatlashing.';
  } else if (plan && plan.chegaralandi) {
    warn = 'Sog\'liq uchun kuniga ' + plan.min_kkal + ' kkal dan kam tavsiya qilinmaydi, shuning uchun sur\'at haftasiga ~' +
      String(Math.abs(plan.hafta_kg)).replace('.', ',') + ' kg.';
  }
  return {
    profil: {
      jins: c.jins, tugilgan_yil: c.tugilgan_yil || '', boy: c.boy || '', vazn: c.vazn || '',
      maqsad: c.maqsad, usul: methodOf_(c), faollik: c.faollik
    },
    toliq: done,
    kkal: plan ? plan.kkal : 0,
    reja: plan,
    bmi: bmi,
    ogohlantirish: warn,
    maqsad_nomi: goalLabel_(c),
    prognoz: plan && hasMethod_(c.maqsad) ? weightForecast_(c, plan) : null,
    tavsiya: done ? recommendRation_(plan.kkal) : null,
    tarix: hist.slice(-60).map(function (w) { return { sana: w.sana, vazn: w.vazn }; }),
    statistika: weightSummary_(hist),
    sorash_kerak: weightDue_(c, hist),
    sorash_kun: settingNum_('vazn_sorash_kun') || 15,
    maqsadlar: Object.keys(GOALS).map(function (k) { return { value: k, label: GOALS[k].nom }; }),
    usullar: {
      ozish: Object.keys(METHODS).map(function (k) { return { value: k, label: methodLabel_('ozish', k) }; }),
      vazn_olish: Object.keys(METHODS).map(function (k) { return { value: k, label: methodLabel_('vazn_olish', k) }; })
    },
    faolliklar: Object.keys(ACTIVITY).map(function (k) { return { value: k, label: ACTIVITY[k].nom }; })
  };
}

function reqWeight_(v) {
  var n = Math.round(Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) * 10) / 10;
  if (!isFinite(n) || n < 30 || n > 300) fail('Vazn 30 va 300 kg oralig\'ida bo\'lishi kerak');
  return n;
}

/** Vaznni tarixga yozish: bugungi yozuv bo'lsa yangilanadi. */
function recordWeight_(clientId, vazn, actor) {
  var t = today_();
  var ex = where_('VaznTarix', function (w) { return w.mijoz_id === clientId && w.sana === t; })[0];
  if (ex) {
    if (ex.vazn !== vazn) update_('VaznTarix', ex.id, { vazn: vazn }, actor, { audit: false });
  } else {
    insert_('VaznTarix', { mijoz_id: clientId, sana: t, vazn: vazn, kim: actor, yaratilgan: nowIso_() }, actor, { audit: false });
  }
}

/** Mijoz profilini (maqsad, bo'y, vazn ...) saqlaydi. Istalgan maydonni alohida yuborish mumkin. */
function healthSave_(ctx, c, p) {
  var patch = {};
  var year = Number(today_().slice(0, 4));
  if (p.jins !== undefined) {
    if (p.jins !== 'erkak' && p.jins !== 'ayol') fail('Jinsni tanlang');
    patch.jins = p.jins;
  }
  if (p.tugilgan_yil !== undefined) patch.tugilgan_yil = reqInt_(Number(p.tugilgan_yil), 'Tug\'ilgan yil', year - 100, year - 10);
  if (p.boy !== undefined) patch.boy = reqInt_(Number(p.boy), 'Bo\'y (sm)', 100, 230);
  if (p.maqsad !== undefined) {
    if (!GOALS[p.maqsad]) fail('Maqsadni tanlang');
    patch.maqsad = p.maqsad;
  }
  var goal = patch.maqsad || c.maqsad;
  if (p.usul !== undefined && p.usul !== '' && hasMethod_(goal)) {
    if (!METHODS[p.usul]) fail('Usulni tanlang');
    patch.usul = p.usul;
  }
  if (patch.maqsad && !hasMethod_(patch.maqsad)) patch.usul = '';
  if (patch.maqsad && hasMethod_(patch.maqsad) && !patch.usul && !METHODS[c.usul]) patch.usul = 'ortacha';
  if (p.faollik !== undefined) {
    if (!ACTIVITY[p.faollik]) fail('Turmush tarzini tanlang');
    patch.faollik = p.faollik;
  }
  var actor = actor_(ctx);
  if (p.vazn !== undefined && p.vazn !== '') {
    patch.vazn = reqWeight_(p.vazn);
    patch.vazn_soralgan = today_();
    recordWeight_(c.id, patch.vazn, actor);
  }
  update_('Mijozlar', c.id, patch, actor, { amal: 'salomatlik' });
  return healthView_(c);
}

/** Har N kunda faol mijozlardan vaznini so'rash (bot xabari). */
function jobWeightAsk_() {
  var t = today_();
  var n = settingNum_('vazn_sorash_kun') || 15;
  var activeIds = {};
  all_('Buyurtmalar').forEach(function (o) { if (o.holat === 'faol') activeIds[o.mijoz_id] = true; });
  withLock_(function () {
    all_('Mijozlar').forEach(function (c) {
      if (!c.faol || !c.tg_id || !c.vazn || !activeIds[c.id]) return;
      if (!weightDue_(c)) return;
      if (c.vazn_soralgan && diffDays_(c.vazn_soralgan, t) < n) return;
      notifyClient_(c.id, '⚖️ ' + n + ' kun o\'tdi! Bugungi vazningizni kiriting — natijangizni (ozish/vazn olish) kuzatib boramiz.',
        openAppMarkup_('⚖️ Vaznni kiritish'));
      update_('Mijozlar', c.id, { vazn_soralgan: t }, 'tizim', { audit: false });
    });
  });
}

/** Admin: mijozlar vazn statistikasi (boshlang'ich → joriy). */
function weightStats_() {
  var byClient = groupBy_(all_('VaznTarix'), function (w) { return w.mijoz_id; });
  var items = [];
  Object.keys(byClient).forEach(function (cid) {
    var c = get_('Mijozlar', cid);
    if (!c || !c.faol) return;
    var s = weightSummary_(byClient[cid].sort(function (a, b) { return a.sana < b.sana ? -1 : 1; }));
    items.push({
      mijoz_id: cid, ism: c.ism, maqsad: goalLabel_(c),
      boshlangich: s.boshlangich, boshlangich_sana: s.boshlangich_sana,
      joriy: s.joriy, joriy_sana: s.joriy_sana, ozgarish: s.ozgarish, olchovlar: byClient[cid].length
    });
  });
  items.sort(function (a, b) { return a.ozgarish - b.ozgarish; });
  var withChange = items.filter(function (x) { return x.olchovlar > 1; });
  return {
    items: items,
    jami: items.length,
    ozdi: withChange.filter(function (x) { return x.ozgarish < 0; }).length,
    vazn_oldi: withChange.filter(function (x) { return x.ozgarish > 0; }).length,
    ortacha_ozgarish: withChange.length ? round2_(sum_(withChange, function (x) { return x.ozgarish; }) / withChange.length) : 0
  };
}

/** Menyu 6 kunlik: dushanba = 1-kun ... shanba = 6-kun, yakshanba dam. */
function menuDayOf_(date) {
  var w = weekday_(date);
  return w === 0 ? 0 : w;
}
