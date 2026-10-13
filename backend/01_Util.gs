/**
 * Umumiy yordamchi funksiyalar: vaqt (Asia/Tashkent), sana arifmetikasi,
 * id, pul va kiritilgan ma'lumotni tekshirish.
 */

/** Foydalanuvchiga ko'rsatiladigan xato. */
function AppError(message, code) {
  this.name = 'AppError';
  this.message = message;
  this.code = code || 'xato';
}
AppError.prototype = Object.create(Error.prototype);

function fail(message, code) {
  throw new AppError(message, code);
}

// ---------- Vaqt ----------

/** Hozirgi vaqt. Testlarda globalThis.__NOW__ (ms) bilan almashtiriladi. */
function now_() {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  if (g && g.__NOW__) return new Date(g.__NOW__);
  return new Date();
}

function fmt_(date, pattern) {
  return Utilities.formatDate(date, TZ, pattern);
}

/** Bugungi sana, Toshkent vaqti bilan: YYYY-MM-DD. */
function today_() {
  return fmt_(now_(), 'yyyy-MM-dd');
}

/** Hozirgi soat:daqiqa (Toshkent): "HH:mm". */
function nowHM_() {
  return fmt_(now_(), 'HH:mm');
}

/** Vaqt belgisi (Toshkent): "YYYY-MM-DDTHH:mm:ss". */
function nowIso_() {
  return fmt_(now_(), "yyyy-MM-dd'T'HH:mm:ss");
}

/** ISO vaqtni (Toshkent) ms ga aylantiradi. */
function isoToMs_(iso) {
  if (!iso) return 0;
  // Toshkent = UTC+5, yozgi vaqt yo'q
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 5, +m[5], +(m[6] || 0));
}

function msToIso_(ms) {
  return fmt_(new Date(ms), "yyyy-MM-dd'T'HH:mm:ss");
}

// ---------- Sana arifmetikasi (YYYY-MM-DD satrlari, UTC asosida) ----------

function parseDate_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) return null;
  return d;
}

function dateStr_(d) {
  var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function addDays_(s, n) {
  var d = parseDate_(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dateStr_(d);
}

/** 0 = yakshanba ... 6 = shanba */
function weekday_(s) {
  return parseDate_(s).getUTCDay();
}

/** b - a, kunlarda. */
function diffDays_(a, b) {
  return Math.round((parseDate_(b) - parseDate_(a)) / 86400000);
}

function monthOf_(s) {
  return String(s).slice(0, 7);
}

function daysInMonth_(ym) {
  var p = ym.split('-');
  return new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate();
}

function monthStart_(ym) { return ym + '-01'; }
function monthEnd_(ym) { return ym + '-' + ('0' + daysInMonth_(ym)).slice(-2); }

function addMonths_(ym, n) {
  var p = ym.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1 + n, 1));
  return dateStr_(d).slice(0, 7);
}

/** a..b oralig'idagi barcha sanalar (ikkalasi ham kiradi). */
function dateRange_(a, b) {
  var out = [];
  if (!a || !b || a > b) return out;
  for (var d = a; d <= b; d = addDays_(d, 1)) out.push(d);
  return out;
}

/** "HH:mm" -> daqiqa */
function hmToMin_(hm) {
  var p = String(hm || '00:00').split(':');
  return (+p[0]) * 60 + (+p[1] || 0);
}

// ---------- ID, pul ----------

function uid_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

/** Pul butun so'mda (4-bo'lim). */
function money_(x) {
  return Math.round(Number(x) || 0);
}

// ---------- Tekshiruvlar (11.2) ----------

function reqStr_(v, field, maxLen) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) fail(field + ' kiritilmagan');
  if (s.length > (maxLen || 300)) fail(field + ' juda uzun');
  return s;
}

function optStr_(v, maxLen) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if (s.length > (maxLen || 500)) fail('Matn juda uzun');
  return s;
}

/** Musbat butun summa, chegaradan oshmagan. */
function reqMoney_(v, field, allowZero) {
  var n = Number(v);
  if (!isFinite(n) || Math.round(n) !== n) fail(field + ' butun son bo\'lishi kerak');
  if (allowZero ? n < 0 : n <= 0) fail(field + ' musbat bo\'lishi kerak');
  var max = settingNum_('max_summa');
  if (n > max) fail(field + ' juda katta (chegara ' + max + ')');
  return n;
}

function reqPercent_(v, field) {
  var n = Number(v);
  if (!isFinite(n) || n < 0 || n >= 100) fail(field + ' 0 dan 100 gacha bo\'lishi kerak');
  return Math.round(n * 100) / 100;
}

function reqInt_(v, field, min, max) {
  var n = Number(v);
  if (!isFinite(n) || Math.round(n) !== n || n < min || n > max) {
    fail(field + ' ' + min + ' va ' + max + ' oralig\'ida butun son bo\'lishi kerak');
  }
  return n;
}

/** Sana formati va oralig'i (bugundan -400 / +400 kun). */
function reqDate_(v, field, opts) {
  var s = String(v || '').trim();
  if (!parseDate_(s)) fail(field + ' noto\'g\'ri sana (YYYY-MM-DD)');
  var t = today_();
  var o = opts || {};
  var minD = o.min || addDays_(t, -400);
  var maxD = o.max || addDays_(t, 400);
  if (s < minD || s > maxD) fail(field + ' ruxsat etilgan oraliqda emas');
  return s;
}

/** O'zbekiston raqami: +998XXXXXXXXX ko'rinishiga keltiradi. */
function normPhone_(v) {
  var digits = String(v || '').replace(/\D/g, '');
  if (digits.length === 9) digits = '998' + digits;
  if (!/^998\d{9}$/.test(digits)) fail('Telefon raqami noto\'g\'ri (+998 XX XXX XX XX)');
  return '+' + digits;
}

function reqLat_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var n = Number(v);
  if (!isFinite(n) || n < -90 || n > 90) fail('Kenglik noto\'g\'ri');
  return n;
}

function reqLng_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var n = Number(v);
  if (!isFinite(n) || n < -180 || n > 180) fail('Uzunlik noto\'g\'ri');
  return n;
}

function pick_(obj, keys) {
  var out = {};
  keys.forEach(function (k) { if (obj && obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function sum_(arr, fn) {
  var s = 0;
  for (var i = 0; i < arr.length; i++) s += fn ? (Number(fn(arr[i])) || 0) : (Number(arr[i]) || 0);
  return s;
}

function groupBy_(arr, fn) {
  var out = {};
  arr.forEach(function (x) {
    var k = fn(x);
    (out[k] = out[k] || []).push(x);
  });
  return out;
}

function indexBy_(arr, key) {
  var out = {};
  arr.forEach(function (x) { out[x[key]] = x; });
  return out;
}

function round2_(x) {
  return Math.round(x * 100) / 100;
}
