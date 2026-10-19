/**
 * Kaloriya tavsiyasi va vazn statistikasi.
 *
 * Mijoz jinsi, yoshi, bo'yi, vazni, maqsadi va turmush tarzini kiritadi →
 * kunlik kaloriya ehtiyoji hisoblanadi (Mifflin–San Jeor formulasi) va unga eng yaqin ratsion tavsiya qilinadi.
 * Vazn har o'zgarganda VaznTarix ga yoziladi (bir kunda bitta yozuv), har 15 kunda bot qayta so'raydi.
 */

var GOALS = {
  ozish: { nom: 'Ozmoqchiman', k: 0.8 },
  saqlash: { nom: 'Vaznimni saqlamoqchiman', k: 1 },
  vazn_olish: { nom: 'Vazn olmoqchiman', k: 1.15 }
};

var ACTIVITY = {
  ofis: { nom: 'Kam harakat (ofisda o\'tirib ishlayman)', k: 1.2 },
  ortacha: { nom: 'O\'rtacha (haftada 1–3 marta mashq)', k: 1.375 },
  sport: { nom: 'Faol (haftada 4+ marta shug\'ullanaman)', k: 1.55 }
};

function healthComplete_(c) {
  return !!(c.jins && c.tugilgan_yil && c.boy && c.vazn && GOALS[c.maqsad] && ACTIVITY[c.faollik]);
}

/** Kunlik kaloriya ehtiyoji (kkal). */
function dailyKcal_(c) {
  var age = Number(today_().slice(0, 4)) - c.tugilgan_yil;
  var bmr = 10 * c.vazn + 6.25 * c.boy - 5 * age + (c.jins === 'erkak' ? 5 : -161);
  return Math.round(bmr * ACTIVITY[c.faollik].k * GOALS[c.maqsad].k / 10) * 10;
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
  var kcal = done ? dailyKcal_(c) : 0;
  return {
    profil: {
      jins: c.jins, tugilgan_yil: c.tugilgan_yil || '', boy: c.boy || '', vazn: c.vazn || '',
      maqsad: c.maqsad, faollik: c.faollik
    },
    toliq: done,
    kkal: kcal,
    tavsiya: done ? recommendRation_(kcal) : null,
    tarix: hist.slice(-60).map(function (w) { return { sana: w.sana, vazn: w.vazn }; }),
    statistika: weightSummary_(hist),
    sorash_kerak: weightDue_(c, hist),
    sorash_kun: settingNum_('vazn_sorash_kun') || 15,
    maqsadlar: Object.keys(GOALS).map(function (k) { return { value: k, label: GOALS[k].nom }; }),
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
      mijoz_id: cid, ism: c.ism, maqsad: (GOALS[c.maqsad] || {}).nom || '',
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
