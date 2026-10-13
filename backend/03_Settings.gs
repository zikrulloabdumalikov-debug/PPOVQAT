/**
 * Sozlamalar (Sozlama varag'i: kalit / qiymat). Bo'sh bo'lsa DEFAULT_SETTINGS ishlatiladi.
 */

function settingsMap_() {
  var map = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { map[k] = DEFAULT_SETTINGS[k]; });
  all_('Sozlama').forEach(function (r) { if (r.kalit) map[r.kalit] = r.qiymat; });
  return map;
}

function setting_(key) {
  var row = null;
  var rows = all_('Sozlama');
  for (var i = 0; i < rows.length; i++) if (rows[i].kalit === key) { row = rows[i]; break; }
  if (row) return row.qiymat;
  return DEFAULT_SETTINGS.hasOwnProperty(key) ? DEFAULT_SETTINGS[key] : '';
}

function settingNum_(key) {
  return Number(setting_(key)) || 0;
}

function settingJson_(key, fallback) {
  try {
    var v = JSON.parse(setting_(key) || 'null');
    return v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

/** Dam olish kunlari: hafta kunlari (0 = yakshanba) va bayram sanalari. */
function offDays_() {
  var wd = String(setting_('dam_kunlari') || '').split(',')
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x !== ''; })
    .map(Number);
  var hol = settingJson_('bayramlar', []);
  return { weekdays: wd, holidays: hol };
}

function isWorkDay_(date, off) {
  var o = off || offDays_();
  if (o.weekdays.indexOf(weekday_(date)) >= 0) return false;
  if (o.holidays.indexOf(date) >= 0) return false;
  return true;
}

/** Sozlamani tekshirib saqlash; har o'zgarish auditga tushadi. */
var SETTING_VALIDATORS = {
  kesish_vaqti: 'hm', ertalabki_xabar_vaqti: 'hm', kun_oxiri_vaqti: 'hm', eslatma_vaqti: 'hm',
  pauza_foiz: 'pct', narx_kafolat_soat: 'int', mijoz_uxlash_kun: 'int', mijoz_ketgan_kun: 'int',
  katta_xarajat: 'int', max_summa: 'int', min_marja_foiz: 'pct', rate_limit_daqiqa: 'int',
  paket_eslatma_kun: 'int', keshbek_eslatma_kun: 'int',
  bayramlar: 'jsonDates', hududlar: 'jsonStrings', kuryer_hudud: 'jsonObj', sherik_ulushlari: 'jsonShares',
  reja: 'jsonPairs', dam_kunlari: 'weekdays', bizning_xato_qoida: 'faultRule',
  ishga_tushish_sana: 'dateOpt'
};

function validateSetting_(key, value) {
  var v = String(value === undefined || value === null ? '' : value).trim();
  var kind = SETTING_VALIDATORS[key];
  var parsed;
  switch (kind) {
    case 'hm':
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) fail(key + ': vaqt HH:MM bo\'lishi kerak');
      return v;
    case 'pct':
      reqPercent_(v, key); return v;
    case 'int':
      if (!/^\d+$/.test(v)) fail(key + ': butun son bo\'lishi kerak');
      return v;
    case 'dateOpt':
      if (v && !parseDate_(v)) fail(key + ': sana YYYY-MM-DD');
      return v;
    case 'weekdays':
      if (v && !/^[0-6](,[0-6])*$/.test(v.replace(/\s/g, ''))) fail('dam_kunlari: 0-6 raqamlar, vergul bilan');
      return v.replace(/\s/g, '');
    case 'faultRule':
      if (['keyinga', 'keshbek'].indexOf(v) < 0) fail('bizning_xato_qoida: keyinga yoki keshbek');
      return v;
  }
  if (kind && kind.indexOf('json') === 0) {
    try { parsed = JSON.parse(v || 'null'); } catch (e) { fail(key + ': JSON noto\'g\'ri'); }
    if (kind === 'jsonDates' && !(Array.isArray(parsed) && parsed.every(function (d) { return parseDate_(d); }))) fail(key + ': sanalar ro\'yxati kerak');
    if (kind === 'jsonStrings' && !(Array.isArray(parsed) && parsed.every(function (d) { return typeof d === 'string' && d.trim(); }))) fail(key + ': nomlar ro\'yxati kerak');
    if (kind === 'jsonObj' && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) fail(key + ': obyekt kerak');
    if (kind === 'jsonShares') {
      if (!Array.isArray(parsed)) fail('sherik_ulushlari: ro\'yxat kerak');
      var total = sum_(parsed, function (p) { return p.foiz; });
      if (Math.abs(total - 100) > 0.01) fail('Sheriklar ulushi yig\'indisi 100% bo\'lishi kerak');
    }
    if (kind === 'jsonPairs' && !(Array.isArray(parsed) && parsed.every(function (p) { return Array.isArray(p) && p.length === 2; }))) fail(key + ': [[kun, son], ...] kerak');
    return JSON.stringify(parsed);
  }
  return optStr_(v, 2000);
}

function saveSettings_(obj, actor) {
  var t = table_('Sozlama');
  Object.keys(obj).forEach(function (key) {
    if (!DEFAULT_SETTINGS.hasOwnProperty(key)) fail('Noma\'lum sozlama: ' + key);
    var val = validateSetting_(key, obj[key]);
    var row = null;
    for (var i = 0; i < t.rows.length; i++) if (t.rows[i].kalit === key) { row = t.rows[i]; break; }
    if (row) {
      updateRow_(t, row, { qiymat: val }, actor, { muhim: 'sozlama' }, key);
    } else {
      insert_('Sozlama', { kalit: key, qiymat: val }, actor, { muhim: 'sozlama' });
    }
  });
}
