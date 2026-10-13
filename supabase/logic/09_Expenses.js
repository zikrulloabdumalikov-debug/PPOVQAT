/**
 * Xarajat, bozorlik va oyliklar (9-bo'lim). Faqat sheriklar uchun.
 */

function categoryByCode_(kod) {
  var rows = all_('XarajatTurkum');
  for (var i = 0; i < rows.length; i++) if (rows[i].kod === kod) return rows[i];
  fail('Turkum topilmadi: ' + kod);
}

function categoriesList_() {
  return all_('XarajatTurkum').map(function (c) {
    return { id: c.id, nom: c.nom, guruh: c.guruh, guruh_nomi: EXPENSE_GROUPS[c.guruh] || c.guruh, kod: c.kod, hissa: c.hissa, faol: c.faol };
  });
}

function categorySave_(ctx, p) {
  var actor = actor_(ctx);
  var nom = reqStr_(p.nom, 'Turkum nomi', 80);
  if (!EXPENSE_GROUPS[p.guruh]) fail('Guruh noto\'g\'ri');
  if (p.id) {
    var c = mustGet_('XarajatTurkum', p.id, 'Turkum');
    var patch = { nom: nom, hissa: !!p.hissa, faol: p.faol !== false };
    if (!c.kod) patch.guruh = p.guruh; // tizim turkumlarining guruhi o'zgarmaydi
    return update_('XarajatTurkum', c.id, patch, actor);
  }
  return insert_('XarajatTurkum', { nom: nom, guruh: p.guruh, kod: '', hissa: !!p.hissa, faol: true }, actor);
}

function expenseView_(x) {
  var c = get_('XarajatTurkum', x.turkum_id) || {};
  return {
    id: x.id, sana: x.sana, turkum_id: x.turkum_id, turkum: c.nom || '', guruh: c.guruh || '',
    summa: x.summa, izoh: x.izoh, chek: !!x.chek_rasm, kim_kiritdi: x.kim_kiritdi, davr_oy: x.davr_oy,
    manba: x.manba, sherik_id: x.sherik_id, holat: x.holat, tasdiqlagan: x.tasdiqlagan, oylik_id: x.oylik_id
  };
}

/** Xarajat kiritish: summa, turkum, sana (standart bugun), izoh, chek (ixtiyoriy). Kim kiritgani avtomatik. */
function expenseAdd_(ctx, p) {
  var actor = actor_(ctx);
  var summa = reqMoney_(p.summa, 'Summa');
  var cat = mustGet_('XarajatTurkum', p.turkum_id, 'Turkum');
  if (!cat.faol) fail('Bu turkum o\'chirilgan');
  var sana = reqDate_(p.sana || today_(), 'Sana', { max: addDays_(today_(), 1) });
  var davr = p.davr_oy && /^\d{4}-\d{2}$/.test(p.davr_oy) ? p.davr_oy : monthOf_(sana);
  var big = settingNum_('katta_xarajat');
  var needsApproval = big > 0 && summa > big && !p._auto;
  var row = insert_('Xarajatlar', {
    sana: sana, turkum_id: cat.id, summa: summa, izoh: optStr_(p.izoh, 500),
    chek_rasm: p.chek ? saveImage_(p.chek, 'xarajat_' + sana) : '',
    kim_kiritdi: actor, davr_oy: davr,
    manba: cat.kod === 'reklama' ? optStr_(p.manba, 50) : '',
    sherik_id: cat.guruh === 'sherik' ? reqStr_(p.sherik_id, 'Sherik', 80) : '',
    oylik_id: p.oylik_id || '',
    holat: needsApproval ? 'tasdiq_kutilmoqda' : 'tasdiqlandi',
    tasdiqlagan: '', faol: true, yaratilgan: nowIso_()
  }, actor, { muhim: needsApproval ? 'katta_xarajat' : '' });
  if (needsApproval) {
    notifyPartners_('⚠️ Katta xarajat tasdiq kutmoqda: ' + fmtMoney_(summa) + ' so\'m (' + cat.nom + '), kiritdi: ' +
      (ctx.user ? ctx.user.ism : '') + '. Ilovada "Xarajat" bo\'limida tasdiqlang.', ctx.user ? ctx.user.id : '');
  }
  return expenseView_(row);
}

/** 5 mln dan katta xarajatni ikkinchi sherik tasdiqlaydi (9.4). */
function expenseApprove_(ctx, id) {
  var x = mustGet_('Xarajatlar', id, 'Xarajat');
  if (x.holat !== 'tasdiq_kutilmoqda') fail('Bu xarajat tasdiq kutmayapti');
  if (String(x.kim_kiritdi).split(':')[0] === ctx.user.id) fail('Xarajatni kiritgan sherik o\'zi tasdiqlay olmaydi');
  update_('Xarajatlar', x.id, { holat: 'tasdiqlandi', tasdiqlagan: actor_(ctx) }, actor_(ctx), { amal: 'xarajat_tasdiq', muhim: 'katta_xarajat' });
  return expenseView_(x);
}

function expenseReject_(ctx, id) {
  var x = mustGet_('Xarajatlar', id, 'Xarajat');
  if (x.holat !== 'tasdiq_kutilmoqda') fail('Bu xarajat tasdiq kutmayapti');
  if (String(x.kim_kiritdi).split(':')[0] === ctx.user.id) fail('O\'zingiz kiritgan xarajatni rad eta olmaysiz, uni tahrirlang yoki o\'chiring');
  update_('Xarajatlar', x.id, { holat: 'rad_etildi', tasdiqlagan: actor_(ctx), faol: false }, actor_(ctx), { amal: 'xarajat_rad', muhim: 'katta_xarajat' });
  return expenseView_(x);
}

/** Tahrirlash mumkin, eski qiymat Auditda qoladi (9.4). */
function expenseUpdate_(ctx, id, p) {
  var x = mustGet_('Xarajatlar', id, 'Xarajat');
  if (!x.faol) fail('O\'chirilgan xarajat');
  if (x.oylik_id) fail('Oylik xarajatini Oyliklar bo\'limidan o\'zgartiring');
  var patch = {};
  if (p.summa !== undefined) patch.summa = reqMoney_(p.summa, 'Summa');
  if (p.turkum_id !== undefined) {
    var cat = mustGet_('XarajatTurkum', p.turkum_id, 'Turkum');
    patch.turkum_id = cat.id;
  }
  if (p.sana !== undefined) patch.sana = reqDate_(p.sana, 'Sana', { max: addDays_(today_(), 1) });
  if (p.izoh !== undefined) patch.izoh = optStr_(p.izoh, 500);
  if (p.manba !== undefined) patch.manba = optStr_(p.manba, 50);
  if (p.sherik_id !== undefined) patch.sherik_id = optStr_(p.sherik_id, 80);
  if (p.davr_oy !== undefined && /^\d{4}-\d{2}$/.test(p.davr_oy)) patch.davr_oy = p.davr_oy;
  if (p.chek) patch.chek_rasm = saveImage_(p.chek, 'xarajat_' + (patch.sana || x.sana));
  var big = settingNum_('katta_xarajat');
  if (patch.summa !== undefined && big > 0 && patch.summa > big && patch.summa !== x.summa) {
    patch.holat = 'tasdiq_kutilmoqda';
    patch.tasdiqlagan = '';
  }
  update_('Xarajatlar', x.id, patch, actor_(ctx), { amal: 'xarajat_tahrir' });
  if (patch.holat === 'tasdiq_kutilmoqda') {
    notifyPartners_('⚠️ Xarajat ' + fmtMoney_(patch.summa) + ' so\'mga o\'zgartirildi va tasdiq kutmoqda.', ctx.user.id);
  }
  return expenseView_(x);
}

function expenseRemove_(ctx, id) {
  var x = mustGet_('Xarajatlar', id, 'Xarajat');
  if (x.oylik_id) fail('Oylik xarajatini o\'chirib bo\'lmaydi');
  update_('Xarajatlar', x.id, { faol: false }, actor_(ctx), { amal: 'xarajat_ochirish' });
  return { ok: true };
}

function expensesList_(p) {
  var from = p.dan || monthStart_(monthOf_(today_()));
  var to = p.gacha || today_();
  var rows = where_('Xarajatlar', function (x) {
    return x.faol && x.sana >= from && x.sana <= to && (!p.turkum_id || x.turkum_id === p.turkum_id);
  }).sort(function (a, b) { return a.sana < b.sana ? 1 : a.sana > b.sana ? -1 : (a.yaratilgan < b.yaratilgan ? 1 : -1); });
  var pending = where_('Xarajatlar', function (x) { return x.faol && x.holat === 'tasdiq_kutilmoqda'; });
  return {
    dan: from, gacha: to,
    jami: sum_(rows.filter(function (x) { return x.holat === 'tasdiqlandi'; }), function (x) { return x.summa; }),
    items: rows.map(expenseView_),
    tasdiq_kutilmoqda: pending.map(expenseView_),
    turkumlar: categoriesList_(),
    sheriklar: settingJson_('sherik_ulushlari', []).map(function (s) { return s.ism; }),
    manbalar: SOURCES,
    oxirgi_xarajat: lastExpenseDate_()
  };
}

function lastExpenseDate_() {
  var last = '';
  all_('Xarajatlar').forEach(function (x) {
    if (x.faol && !x.oylik_id && x.sana > last) last = x.sana;
  });
  return last;
}

// ---------- Xodimlar va oyliklar (9.3) ----------

var SALARY_TYPES = {
  qatiy: "Qat'iy oylik",
  kunlik: 'Kunlik stavka × ishlagan kun',
  yetkazish: 'Yetkazish soni × stavka'
};

function staffSave_(ctx, p) {
  var actor = actor_(ctx);
  if (!SALARY_TYPES[p.oylik_turi]) fail('Oylik turini tanlang');
  var row = {
    ism: reqStr_(p.ism, 'Ism', 80),
    lavozim: reqStr_(p.lavozim, 'Lavozim', 50),
    oylik_turi: p.oylik_turi,
    summa: reqMoney_(p.summa, 'Stavka'),
    tg_id: p.tg_id ? String(p.tg_id).replace(/\D/g, '') : '',
    faol: p.faol !== false
  };
  if (p.id) {
    mustGet_('Xodimlar', p.id, 'Xodim');
    return update_('Xodimlar', p.id, row, actor);
  }
  return insert_('Xodimlar', row, actor);
}

function payrollRow_(xodimId, ym) {
  var rows = where_('Oyliklar', function (o) { return o.xodim_id === xodimId && o.oy === ym; });
  return rows[0] || null;
}

function ensurePayrollRow_(xodimId, ym, actor) {
  var r = payrollRow_(xodimId, ym);
  if (r) return r;
  return insert_('Oyliklar', {
    xodim_id: xodimId, oy: ym, hisoblangan: 0, avans: 0, tolangan: 0, ishlagan_kun: 0, yetkazish_soni: 0, sana: ''
  }, actor);
}

function workDaysInMonth_(ym) {
  var off = offDays_();
  return dateRange_(monthStart_(ym), monthEnd_(ym)).filter(function (d) { return isWorkDay_(d, off); }).length;
}

function courierDeliveredCount_(xodim, ym) {
  if (!xodim.tg_id) return 0;
  var users = all_('Foydalanuvchilar').filter(function (u) { return u.tg_id === xodim.tg_id; }).map(function (u) { return u.id; });
  return where_('Yetkazishlar', function (d) {
    return d.holat === 'yetkazildi' && monthOf_(d.sana) === ym && users.indexOf(d.kuryer_id) >= 0;
  }).length;
}

function calcSalary_(xodim, ym, row) {
  var days = row && row.ishlagan_kun ? row.ishlagan_kun : workDaysInMonth_(ym);
  var deliveries = courierDeliveredCount_(xodim, ym);
  var h;
  if (xodim.oylik_turi === 'kunlik') h = xodim.summa * days;
  else if (xodim.oylik_turi === 'yetkazish') h = xodim.summa * deliveries;
  else h = xodim.summa;
  return { hisoblangan: money_(h), ishlagan_kun: days, yetkazish_soni: deliveries };
}

/** "Oyliklar" ekrani: har xodim uchun hisoblangan, avans, to'langan, qolgan. */
function payrollMonth_(ym) {
  var staff = all_('Xodimlar');
  var rows = staff.filter(function (x) { return x.faol || payrollRow_(x.id, ym); }).map(function (x) {
    var r = payrollRow_(x.id, ym);
    var calc = calcSalary_(x, ym, r);
    var hisob = r && r.tolangan > 0 ? r.hisoblangan : calc.hisoblangan; // to'langandan keyin qotadi
    var avans = r ? r.avans : 0, tol = r ? r.tolangan : 0;
    return {
      xodim_id: x.id, ism: x.ism, lavozim: x.lavozim, oylik_turi: x.oylik_turi, oylik_turi_nomi: SALARY_TYPES[x.oylik_turi],
      stavka: x.summa, ishlagan_kun: calc.ishlagan_kun, yetkazish_soni: calc.yetkazish_soni,
      hisoblangan: hisob, avans: avans, tolangan: tol, qolgan: hisob - avans - tol,
      tolandi: tol > 0, sana: r ? r.sana : ''
    };
  });
  return {
    oy: ym, items: rows,
    xodimlar: staff.map(function (x) { return pick_(x, ['id', 'ism', 'lavozim', 'oylik_turi', 'summa', 'tg_id', 'faol']); }),
    turlar: SALARY_TYPES,
    kuryer_statistika: courierMonthStats_(ym)
  };
}

function salaryAdvance_(ctx, p) {
  var actor = actor_(ctx);
  var x = mustGet_('Xodimlar', p.xodim_id, 'Xodim');
  var ym = /^\d{4}-\d{2}$/.test(p.oy) ? p.oy : fail('Oy noto\'g\'ri');
  var summa = reqMoney_(p.summa, 'Avans');
  var r = ensurePayrollRow_(x.id, ym, actor);
  if (r.tolangan > 0) fail('Bu oy uchun oylik allaqachon to\'langan');
  update_('Oyliklar', r.id, { avans: r.avans + summa }, actor, { amal: 'avans' });
  expenseAdd_(ctx, {
    summa: summa, turkum_id: categoryByCode_('oylik').id, sana: p.sana || today_(), davr_oy: ym,
    izoh: 'Avans: ' + x.ism + ' (' + ym + ')', oylik_id: r.id, _auto: true
  });
  return payrollMonth_(ym);
}

function salarySetDays_(ctx, p) {
  var x = mustGet_('Xodimlar', p.xodim_id, 'Xodim');
  var ym = /^\d{4}-\d{2}$/.test(p.oy) ? p.oy : fail('Oy noto\'g\'ri');
  var days = reqInt_(p.ishlagan_kun, 'Ishlagan kun', 0, 31);
  var r = ensurePayrollRow_(x.id, ym, actor_(ctx));
  if (r.tolangan > 0) fail('To\'langan oylikni o\'zgartirib bo\'lmaydi');
  update_('Oyliklar', r.id, { ishlagan_kun: days }, actor_(ctx));
  return payrollMonth_(ym);
}

/**
 * "To'landi": qolgan summa Xarajatlarga "Oylik" turkumi bilan o'zi yoziladi.
 * Bir xodim, bir oy — bir to'lov: ikki marta bosilsa takrorlanmaydi.
 */
function salaryPay_(ctx, p) {
  var actor = actor_(ctx);
  var x = mustGet_('Xodimlar', p.xodim_id, 'Xodim');
  var ym = /^\d{4}-\d{2}$/.test(p.oy) ? p.oy : fail('Oy noto\'g\'ri');
  var r = ensurePayrollRow_(x.id, ym, actor);
  if (r.tolangan > 0) return { already: true, oyliklar: payrollMonth_(ym) };
  var calc = calcSalary_(x, ym, r);
  var qolgan = calc.hisoblangan - r.avans;
  if (qolgan <= 0) fail('To\'lanadigan summa qolmagan (hisoblangan ' + calc.hisoblangan + ', avans ' + r.avans + ')');
  update_('Oyliklar', r.id, {
    hisoblangan: calc.hisoblangan, ishlagan_kun: calc.ishlagan_kun, yetkazish_soni: calc.yetkazish_soni,
    tolangan: qolgan, sana: today_()
  }, actor, { amal: 'oylik_tolov', muhim: 'oylik' });
  expenseAdd_(ctx, {
    summa: qolgan, turkum_id: categoryByCode_('oylik').id, sana: today_(), davr_oy: ym,
    izoh: 'Oylik: ' + x.ism + ' (' + ym + ')', oylik_id: r.id, _auto: true
  });
  return { already: false, oyliklar: payrollMonth_(ym) };
}
