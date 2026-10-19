// AVTOMATIK YARATILGAN FAYL — tahrirlamang. Manba: supabase/logic/*.js
// Yig'ish: node scripts/build-logic.mjs
// Biznes mantiq Apps Script versiyasidan o'zgarishsiz ko'chirilgan (TZ 5, 9, 10-bo'limlar).
// deno-lint-ignore-file
// @ts-nocheck

// ===== 00_Config.js =====
/**
 * Soglom Ovqatlar — server konfiguratsiyasi.
 *
 * Baza: Google Sheets. Har bir varaq = bitta jadval (TZ 4-bo'lim).
 * Ustun turlari: s = matn, n = butun son (so'm, kun), f = kasr son (foiz),
 * g = bo'sh bo'lishi mumkin bo'lgan son (lat/lng), b = ha/yo'q, j = JSON, d = sana (YYYY-MM-DD), t = vaqt (ISO).
 * Hammasi Sheetsga matn ko'rinishida yoziladi (ustun formati "@"), shuning uchun
 * Sheets sanani o'zicha o'zgartirib yubormaydi.
 */

var APP_NAME = "Sog'lom Ovqatlar";
var TZ = 'Asia/Tashkent';

var ROLES = {
  CLIENT: 'mijoz',
  PARTNER: 'sherik',
  OPERATOR: 'operator',
  COURIER: 'kuryer'
};

var SCHEMA = {
  Foydalanuvchilar: [
    ['id', 's'], ['tg_id', 's'], ['rol', 's'], ['ism', 's'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Mijozlar: [
    ['id', 's'], ['tg_id', 's'], ['ism', 's'], ['telefon', 's'], ['manba', 's'],
    ['royxatdan_sana', 'd'], ['holat', 's'], ['izoh', 's'], ['til', 's'],
    ['rozilik_vaqt', 't'], ['telefon_sorov', 's'], ['kim_yaratdi', 's'], ['faol', 'b'],
    ['jins', 's'], ['tugilgan_yil', 'n'], ['boy', 'n'], ['vazn', 'f'], ['maqsad', 's'], ['faollik', 's'],
    ['vazn_soralgan', 'd']
  ],
  Manzillar: [
    ['id', 's'], ['mijoz_id', 's'], ['nom', 's'], ['lat', 'g'], ['lng', 'g'], ['matn', 's'],
    ['moljal', 's'], ['hudud', 's'], ['faol', 'b']
  ],
  Ratsionlar: [
    ['id', 's'], ['nom', 's'], ['kaloriya', 's'], ['tavsif', 's'],
    ['tannarx_ovqat', 'n'], ['tannarx_qadoq_yetkazish', 'n'], ['faol', 'b']
  ],
  Narxlar: [
    ['id', 's'], ['ratsion_id', 's'], ['kunlik_narx', 'n'], ['qachondan', 'd'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Paketlar: [
    ['id', 's'], ['nom', 's'], ['kunlar', 'n'], ['chegirma_foiz', 'f'], ['qachondan', 'd'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  KeshbekQoida: [
    ['id', 's'], ['foiz', 'f'], ['amal_muddati_kun', 'n'], ['min_summa', 'n'],
    ['max_ulush_foiz', 'f'], ['qachondan', 'd'], ['yaratilgan', 't']
  ],
  Buyurtmalar: [
    ['id', 's'], ['mijoz_id', 's'], ['manzil_id', 's'], ['ratsion_id', 's'], ['paket_id', 's'],
    ['kunlar', 'n'], ['boshlanish', 'd'], ['tugash', 'd'],
    ['kunlik_narx', 'n'], ['chegirma_foiz', 'f'], ['keshbek_foiz', 'f'], ['keshbek_muddat_kun', 'n'],
    ['keshbek_ishlatildi', 'n'], ['jami', 'n'], ['tolanadi', 'n'], ['kunlik_daromad', 'f'],
    ['tolov_holati', 's'], ['holat', 's'], ['kim_yaratdi', 's'], ['yaratuvchi_id', 's'],
    ['yaratilgan', 't'], ['narx_muddati', 't'], ['tolov_usuli', 's'], ['izoh', 's'],
    ['qaytarilgan', 'n'], ['eslatma_yuborildi', 'b']
  ],
  Yetkazishlar: [
    ['id', 's'], ['buyurtma_id', 's'], ['mijoz_id', 's'], ['sana', 'd'], ['holat', 's'], ['sabab', 's'],
    ['kuryer_id', 's'], ['hudud', 's'], ['ratsion_id', 's'], ['izoh', 's'], ['vaqt', 't'], ['yoldaman_vaqt', 't']
  ],
  Tolovlar: [
    ['id', 's'], ['buyurtma_id', 's'], ['summa', 'n'], ['usul', 's'], ['sana', 'd'],
    ['holat', 's'], ['tasdiqlagan', 's'], ['chek_rasm', 's'], ['izoh', 's'], ['yaratilgan', 't']
  ],
  KeshbekHarakat: [
    ['id', 's'], ['mijoz_id', 's'], ['buyurtma_id', 's'], ['tur', 's'], ['summa', 'n'],
    ['sana', 'd'], ['tugash_sana', 'd'], ['manba_id', 's'], ['izoh', 's'], ['kim', 's']
  ],
  XarajatTurkum: [
    ['id', 's'], ['nom', 's'], ['guruh', 's'], ['kod', 's'], ['hissa', 'b'], ['faol', 'b']
  ],
  Xarajatlar: [
    ['id', 's'], ['sana', 'd'], ['turkum_id', 's'], ['summa', 'n'], ['izoh', 's'], ['chek_rasm', 's'],
    ['kim_kiritdi', 's'], ['davr_oy', 's'], ['manba', 's'], ['sherik_id', 's'], ['oylik_id', 's'],
    ['holat', 's'], ['tasdiqlagan', 's'], ['faol', 'b'], ['yaratilgan', 't']
  ],
  Xodimlar: [
    ['id', 's'], ['ism', 's'], ['lavozim', 's'], ['oylik_turi', 's'], ['summa', 'n'],
    ['tg_id', 's'], ['faol', 'b']
  ],
  Oyliklar: [
    ['id', 's'], ['xodim_id', 's'], ['oy', 's'], ['hisoblangan', 'n'], ['avans', 'n'], ['tolangan', 'n'],
    ['ishlagan_kun', 'n'], ['yetkazish_soni', 'n'], ['sana', 'd']
  ],
  Menyu: [
    ['id', 's'], ['sana', 'd'], ['ratsion_id', 's'], ['taomlar', 's'], ['kaloriya', 'n'], ['faol', 'b']
  ],
  VaznTarix: [
    ['id', 's'], ['mijoz_id', 's'], ['sana', 'd'], ['vazn', 'f'], ['kim', 's'], ['yaratilgan', 't']
  ],
  Audit: [
    ['id', 's'], ['vaqt', 't'], ['kim', 's'], ['amal', 's'], ['varaq', 's'], ['yozuv_id', 's'],
    ['eski', 's'], ['yangi', 's'], ['muhim', 's']
  ],
  Sozlama: [
    ['kalit', 's'], ['qiymat', 's']
  ]
};

/** Sozlamalar standart qiymatlari (TZ 5, 7, 8, 9, 10, 13-bo'limlardagi misollar). */
var DEFAULT_SETTINGS = {
  kesish_vaqti: '18:00',
  dam_kunlari: '0',                      // 0 = yakshanba (JS getDay), vergul bilan
  bayramlar: '[]',                       // ["2026-01-01", ...]
  pauza_foiz: '20',
  narx_kafolat_soat: '48',
  hududlar: '["Chilonzor","Yunusobod","Mirzo Ulug\'bek","Yakkasaroy","Sergeli"]',
  kuryer_hudud: '{}',                    // {"Chilonzor": "<foydalanuvchi_id>"}
  mijoz_uxlash_kun: '14',
  mijoz_ketgan_kun: '45',
  katta_xarajat: '5000000',
  max_summa: '200000000',                // har qanday bitta summa uchun yuqori chegara (validatsiya)
  min_marja_foiz: '15',
  sherik_ulushlari: '[{"ism":"Sherik 1","foiz":25},{"ism":"Sherik 2","foiz":35},{"ism":"Sherik 3","foiz":40}]',
  bizning_xato_qoida: 'keyinga',          // keyinga | keshbek
  karta_raqami: '',
  karta_egasi: '',
  aloqa_telefon: '',
  yetkazish_vaqti: '08:00-13:00',
  ertalabki_xabar_vaqti: '08:00',
  kun_oxiri_vaqti: '21:00',
  eslatma_vaqti: '10:00',
  kuryer_guruh_chat_id: '',
  ishga_tushish_sana: '',
  reja: '[[0,0],[30,6],[60,10],[90,15]]', // [kun, ratsion/kun] — 10.3 reja chizig'i
  rate_limit_daqiqa: '60',
  paket_eslatma_kun: '2',
  keshbek_eslatma_kun: '7',
  backup_papka_id: '',
  arxiv_papka_id: '',
  chek_papka_id: '',
  katalog: '[]',                         // menyu (katalog) rasmlari: [{"yol":"...","nom":"..."}]
  vazn_sorash_kun: '15',                 // mijozdan vaznini necha kunda bir so'rash (statistika uchun)
  rozilik_matni: "Ro'yxatdan o'tish orqali ism, telefon raqami va manzilingiz buyurtmani yetkazish va xizmat ko'rsatish uchun qayta ishlanishiga rozilik bildirasiz. Istalgan vaqtda ma'lumotlaringizni o'chirishni so'rashingiz mumkin."
};

/** Mijozni qayerdan topgani (manba). */
var SOURCES = ['Instagram', 'Blogger', 'Tavsiya', 'Telegram', 'Boshqa'];

/** Yetkazib bo'lmadi sabablari (8.3). mijoz_aybi = kun kuyadi, bizning_xato = kun kuymaydi. */
var FAIL_REASONS = {
  javob_bermadi: { nom: 'Mijoz javob bermadi', ayb: 'mijoz' },
  manzil_topilmadi: { nom: 'Manzil topilmadi', ayb: 'mijoz' },
  rad_etdi: { nom: 'Mijoz rad etdi', ayb: 'mijoz' },
  kech_qoldi: { nom: 'Bizning xato: kech qoldi', ayb: 'biz' },
  notogri_ovqat: { nom: "Bizning xato: noto'g'ri ovqat", ayb: 'biz' }
};

/** Boshlang'ich xarajat turkumlari (9.1). */
var DEFAULT_CATEGORIES = [
  ['Bozorlik', 'ozgaruvchan', 'bozorlik', true],
  ['Qadoq va idish', 'ozgaruvchan', 'qadoq', true],
  ["Yetkazish yoqilg'isi / taksi", 'ozgaruvchan', 'yetkazish', true],
  ['Reklama', 'ozgaruvchan', 'reklama', false],
  ["Boshqa o'zgaruvchan", 'ozgaruvchan', '', false],
  ['Ijara', 'doimiy', 'ijara', false],
  ['Elektr', 'doimiy', '', false],
  ['Internet', 'doimiy', '', false],
  ["Boshqa oylik to'lovlar", 'doimiy', '', false],
  ['Oylik', 'oylik', 'oylik', false],
  ['Sherik taqsimoti', 'sherik', 'sherik', false]
];

var EXPENSE_GROUPS = {
  ozgaruvchan: "O'zgaruvchan",
  doimiy: 'Doimiy',
  oylik: 'Oylik',
  sherik: 'Sherik taqsimoti'
};

// ===== 01_Util.js =====
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
  var g = globalThis;
  if (g.__NOW__) return new Date(g.__NOW__);
  return new Date();
}

/** Utilities.formatDate o'rnini bosadi. Asia/Tashkent = UTC+5, yozgi vaqt yo'q. */
function fmt_(date, pattern) {
  var d = new Date(date.getTime() + 5 * 3600 * 1000);
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var map = {
    yyyy: String(d.getUTCFullYear()), MM: p2(d.getUTCMonth() + 1), dd: p2(d.getUTCDate()),
    HH: p2(d.getUTCHours()), mm: p2(d.getUTCMinutes()), ss: p2(d.getUTCSeconds())
  };
  return pattern.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss/g, function (m, lit) {
    return lit !== undefined ? lit : map[m];
  });
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
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
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

// ===== 02_Db.js =====
/**
 * Jadval qatlami (Supabase versiyasi).
 *
 * Biznes mantiq sinxron va xotirada ishlaydi:
 *   1) runtime kerakli jadvallarni Postgres'dan o'qib dbInstall_ ga beradi;
 *   2) mantiq all_/get_/insert_/update_ bilan ishlaydi (Apps Script versiyasidagi kabi);
 *   3) barcha yozuvlar OPS navbatiga tushadi va runtime ularni bitta tranzaksiyada bajaradi.
 * Xato bo'lsa navbat tashlab yuboriladi — bazaga hech narsa yozilmaydi.
 *
 * Hech narsa o'chirilmaydi: "o'chirish" = faol = false (4-bo'lim qoidasi).
 */

var TABLE_NAMES = {
  Foydalanuvchilar: 'foydalanuvchilar', Mijozlar: 'mijozlar', Manzillar: 'manzillar', Ratsionlar: 'ratsionlar',
  Narxlar: 'narxlar', Paketlar: 'paketlar', KeshbekQoida: 'keshbek_qoida', Buyurtmalar: 'buyurtmalar',
  Yetkazishlar: 'yetkazishlar', Tolovlar: 'tolovlar', KeshbekHarakat: 'keshbek_harakat',
  XarajatTurkum: 'xarajat_turkum', Xarajatlar: 'xarajatlar', Xodimlar: 'xodimlar', Oyliklar: 'oyliklar',
  Menyu: 'menyu', VaznTarix: 'vazn_tarix', Audit: 'audit', Sozlama: 'sozlama'
};

var DB_CACHE = {};
var OPS = [];
var AUDIT_BUFFER = [];
var KESH = {};
var BACKUP_REQUESTED = false;

function colTypes_(name) {
  var map = {};
  (SCHEMA[name] || []).forEach(function (c) { map[c[0]] = c[1]; });
  return map;
}

/** Xotiradagi ko'rinish (Apps Script versiyasidagi kabi): bo'sh matn = '', bo'sh son = 0. */
function fromCell_(v, type) {
  if (v instanceof Date) {
    if (type === 'd') return fmt_(v, 'yyyy-MM-dd');
    if (type === 't') return fmt_(v, "yyyy-MM-dd'T'HH:mm:ss");
  }
  switch (type) {
    case 'b': return v === true || v === 'ha' || v === 'TRUE' || v === 'true' || v === 't';
    case 'n':
    case 'f': return v === '' || v === null || v === undefined ? 0 : Number(v) || 0;
    case 'g': return v === '' || v === null || v === undefined ? '' : Number(v);
    case 'j':
      if (!v) return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch (e) { return null; }
    case 'd': return v ? String(v).slice(0, 10) : '';
    case 't': return v ? String(v).replace(' ', 'T').slice(0, 19) : '';
    default: return v === null || v === undefined ? '' : String(v);
  }
}

/** Postgres parametri: bo'sh qiymat = NULL, pul butun son, vaqt Toshkent (+05:00). */
function toPg_(v, type) {
  var empty = v === undefined || v === null || v === '';
  switch (type) {
    case 'b': return v === true || v === 'ha';
    case 'n': return empty ? null : Math.round(Number(v) || 0);
    case 'f':
    case 'g': return empty ? null : Number(v);
    case 'd': return empty ? null : String(v).slice(0, 10);
    case 't':
      if (empty) return null;
      var s = String(v);
      return /[+-]\d\d:?\d\d$|Z$/.test(s) ? s : s + '+05:00';
    case 'j': return empty ? null : (typeof v === 'string' ? v : JSON.stringify(v));
    default: return empty ? null : String(v);
  }
}

function normalizeRow_(name, raw) {
  var types = colTypes_(name);
  var obj = {};
  Object.keys(types).forEach(function (c) { obj[c] = fromCell_(raw[c], types[c]); });
  return obj;
}

/**
 * Runtime chaqiradi: data = { 'Buyurtmalar': [pg qatorlar], ... }, kesh = { kalit: {qiymat, tugash(ms)} }.
 * Berilmagan jadvalga murojaat — xato (yuklash ro'yxatidagi kamchilikni darhol ko'rsatadi).
 */
function dbInstall_(data, kesh) {
  DB_CACHE = {};
  OPS = [];
  AUDIT_BUFFER = [];
  NOTIFY_QUEUE = [];
  BACKUP_REQUESTED = false;
  KESH = kesh || {};
  Object.keys(data).forEach(function (name) {
    var rows = data[name].map(function (r) { return normalizeRow_(name, r); });
    var byId = {};
    rows.forEach(function (r) { if (r.id) byId[r.id] = r; });
    DB_CACHE[name] = { name: name, header: SCHEMA[name].map(function (c) { return c[0]; }), types: colTypes_(name), rows: rows, byId: byId };
  });
}

function dbReset_() { /* Apps Script bilan moslik uchun */ }

function table_(name) {
  var t = DB_CACHE[name];
  if (!t) throw new Error('Jadval yuklanmagan: ' + name);
  return t;
}

function all_(name) { return table_(name).rows; }

function where_(name, fn) { return table_(name).rows.filter(fn); }

function get_(name, id) { return table_(name).byId[id] || null; }

function mustGet_(name, id, what) {
  var x = id ? get_(name, id) : null;
  if (!x) fail((what || 'Yozuv') + ' topilmadi', 'topilmadi');
  return x;
}

function pgRow_(name, obj) {
  var types = colTypes_(name);
  var out = {};
  Object.keys(types).forEach(function (c) { if (obj[c] !== undefined) out[c] = toPg_(obj[c], types[c]); });
  return out;
}

function insertMany_(name, objs, actor, opts) {
  if (!objs.length) return [];
  var t = table_(name);
  var o = opts || {};
  var hasId = t.header.indexOf('id') >= 0;
  var out = objs.map(function (obj) {
    var full = {};
    var src = hasId ? Object.assign({ id: uid_() }, obj) : obj;
    t.header.forEach(function (h) { full[h] = fromCell_(src[h] === undefined ? '' : src[h], t.types[h]); });
    return full;
  });
  out.forEach(function (x) {
    t.rows.push(x);
    if (x.id) t.byId[x.id] = x;
  });
  OPS.push({ op: 'insert', table: TABLE_NAMES[name], rows: out.map(function (x) { return pgRow_(name, x); }) });
  if (o.audit !== false && name !== 'Audit') {
    if (out.length === 1) {
      audit_(actor, o.amal || 'qoshish', name, out[0].id || out[0].kalit, '', out[0], o.muhim);
    } else {
      audit_(actor, o.amal || 'qoshish', name, out.map(function (x) { return x.id; }).join(',').slice(0, 2000), '',
        { soni: out.length }, o.muhim);
    }
  }
  return out;
}

function insert_(name, obj, actor, opts) {
  return insertMany_(name, [obj], actor, opts)[0];
}

function update_(name, id, patch, actor, opts) {
  var t = table_(name);
  var cur = t.byId[id];
  if (!cur) fail('Yozuv topilmadi: ' + name, 'topilmadi');
  return updateRow_(t, cur, patch, actor, opts, id);
}

/** Faqat o'zgargan maydonlar yoziladi va auditga tushadi. */
function updateRow_(t, cur, patch, actor, opts, auditId) {
  var o = opts || {};
  var before = {}, after = {}, changed = false;
  Object.keys(patch).forEach(function (k) {
    if (k === 'id' || t.header.indexOf(k) < 0) return;
    var type = t.types[k] || 's';
    var nv = fromCell_(patch[k] === undefined || patch[k] === null ? '' : patch[k], type);
    if (type === 'b') nv = patch[k] === true || patch[k] === 'ha';
    var ov = cur[k];
    if (JSON.stringify(nv) !== JSON.stringify(ov)) {
      before[k] = ov;
      after[k] = nv;
      cur[k] = nv;
      changed = true;
    }
  });
  if (!changed) return cur;
  var key = t.name === 'Sozlama' ? 'kalit' : 'id';
  OPS.push({ op: 'update', table: TABLE_NAMES[t.name], key: key, val: cur[key], patch: pgRow_(t.name, after) });
  if (o.audit !== false) audit_(actor, o.amal || 'ozgartirish', t.name, auditId, before, after, o.muhim);
  return cur;
}

function audit_(actor, amal, varaq, yozuvId, eski, yangi, muhim) {
  AUDIT_BUFFER.push({
    id: uid_(),
    vaqt: nowIso_(),
    kim: actor || 'tizim',
    amal: amal,
    varaq: varaq,
    yozuv_id: yozuvId || '',
    eski: eski === '' || eski === undefined ? '' : JSON.stringify(eski).slice(0, 4000),
    yangi: yangi === '' || yangi === undefined ? '' : JSON.stringify(yangi).slice(0, 4000),
    muhim: muhim || ''
  });
}

/** Audit yozuvlari navbatning oxiriga qo'shiladi (Audit ilova orqali o'zgartirilmaydi). */
function dbFlush_() {
  if (!AUDIT_BUFFER.length) return;
  var buf = AUDIT_BUFFER;
  AUDIT_BUFFER = [];
  if (DB_CACHE.Audit) buf.forEach(function (a) { DB_CACHE.Audit.rows.push(normalizeRow_('Audit', a)); });
  OPS.push({ op: 'insert', table: 'audit', rows: buf.map(function (a) { return pgRow_('Audit', a); }) });
}

/** Navbatni olib beradi va tozalaydi (runtime chaqiradi). */
function dbTake_() {
  dbFlush_();
  var res = { ops: OPS, notify: NOTIFY_QUEUE, backup: BACKUP_REQUESTED };
  OPS = [];
  NOTIFY_QUEUE = [];
  BACKUP_REQUESTED = false;
  return res;
}

/** Qulf runtime'da: har bir yozuvchi so'rov pg_advisory_xact_lock bilan tranzaksiyada ishlaydi. */
function withLock_(fn) {
  return fn();
}

/** CacheService o'rnini bosuvchi: "kesh" jadvali (oldindan yuklanadi, yozuvlar navbat orqali). */
var CacheService = {
  getScriptCache: function () {
    var put = function (k, v, ttlSec) {
      var tugash = now_().getTime() + (ttlSec || 600) * 1000;
      KESH[k] = { qiymat: String(v), tugash: tugash };
      OPS.push({ op: 'kesh', kalit: k, qiymat: String(v), tugash: tugash });
    };
    return {
      get: function (k) {
        var e = KESH[k];
        if (!e || (e.tugash && e.tugash <= now_().getTime())) return null;
        return e.qiymat;
      },
      put: put,
      // jismoniy o'chirish yo'q: muddatini tugatamiz
      remove: function (k) {
        if (!KESH[k]) return;
        KESH[k] = { qiymat: KESH[k].qiymat, tugash: now_().getTime() };
        OPS.push({ op: 'kesh', kalit: k, qiymat: KESH[k].qiymat, tugash: KESH[k].tugash });
      }
    };
  }
};

// ===== 03_Settings.js =====
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
  paket_eslatma_kun: 'int', keshbek_eslatma_kun: 'int', vazn_sorash_kun: 'int',
  bayramlar: 'jsonDates', hududlar: 'jsonStrings', kuryer_hudud: 'jsonObj', sherik_ulushlari: 'jsonShares',
  reja: 'jsonPairs', dam_kunlari: 'weekdays', bizning_xato_qoida: 'faultRule',
  ishga_tushish_sana: 'dateOpt', katalog: 'jsonList'
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
    if (kind === 'jsonList' && !Array.isArray(parsed)) fail(key + ': ro\'yxat kerak');
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

// ===== 04_Auth.js =====
/**
 * Kirish va ruxsat (2, 11.1-bo'lim) — sinxron qism.
 * Telegram initData imzosi (HMAC, 24 soat) runtime.ts da Web Crypto bilan tekshiriladi;
 * bu yerda tekshirilgan Telegram foydalanuvchisidan rol va mijoz aniqlanadi.
 */

/** Imzolangan Telegram ID bo'yicha so'rov konteksti. */
function resolveCtx_(tgUser) {
  var tgId = String(tgUser.id);
  var user = null;
  all_('Foydalanuvchilar').forEach(function (u) {
    if (u.tg_id === tgId && u.faol) user = u;
  });
  var ctx = { tgId: tgId, tgUser: tgUser, user: user, role: user ? user.rol : null, client: null };
  if (user && user.rol === ROLES.CLIENT) ctx.client = clientByTg_(tgId);
  return ctx;
}

/**
 * ADMIN_TG_IDS (Supabase secret) dagi sherik birinchi marta kirganda Foydalanuvchilar ga qo'shiladi
 * (Apps Script versiyasidagi setup() bilan bir xil).
 */
function ensureAdmin_(tgId, adminIds) {
  var idx = adminIds.indexOf(tgId);
  if (idx < 0) return false;
  var exists = all_('Foydalanuvchilar').some(function (u) { return u.tg_id === tgId && u.faol; });
  if (exists) return false;
  insert_('Foydalanuvchilar', { tg_id: tgId, rol: ROLES.PARTNER, ism: 'Sherik ' + (idx + 1), faol: true, yaratilgan: nowIso_() }, 'tizim', { muhim: 'rol' });
  return true;
}

function clientByTg_(tgId) {
  var rows = all_('Mijozlar');
  for (var i = 0; i < rows.length; i++) if (rows[i].tg_id === tgId && rows[i].faol) return rows[i];
  return null;
}

function requireRole_(ctx, roles) {
  if (!ctx.role || roles.indexOf(ctx.role) < 0) fail('Ruxsat yo\'q', 'ruxsat');
}

function isStaff_(ctx) {
  return ctx.role === ROLES.PARTNER || ctx.role === ROLES.OPERATOR;
}

/** Audit uchun "kim": foydalanuvchi id + ism. */
function actor_(ctx) {
  if (!ctx || !ctx.user) return 'tizim';
  return ctx.user.id + ':' + (ctx.user.ism || ctx.user.rol);
}

// ===== 05_Pricing.js =====
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

/** Bitta buyurtmada ko'pi bilan necha kun (1 yil ≈ 312 ish kuni, yakshanbasiz). */
var MAX_ORDER_DAYS = 320;

/**
 * Buyurtma kunlari: mijoz istalgan sonni yozadi (1 kundan 1 yilgacha).
 * Eski so'rovlar (paket_id) ham qabul qilinadi — paketning kunlar soni olinadi.
 */
function orderDays_(p, date) {
  if (p && p.kunlar !== undefined && p.kunlar !== null && p.kunlar !== '') {
    return reqInt_(Number(p.kunlar), 'Kunlar soni', 1, MAX_ORDER_DAYS);
  }
  if (p && p.paket_id) return packageById_(p.paket_id, date || today_()).kunlar;
  fail('Necha kunlik buyurtma ekanini kiriting');
}

/**
 * N kunlik buyurtma uchun paket chegirmasi: kunlar soni N dan oshmaydigan eng katta paket
 * (masalan "10 kun — 10%" paketi bo'lsa, 10, 30, 312 kunlik buyurtmaga 10%; 9 kunlikka chegirma yo'q).
 * Bekor qilishdagi qayta hisob (discountForDays_) bilan bir xil qoida.
 */
function packageForDays_(days, date) {
  var pkgs = activePackages_(date).filter(function (p) { return p.kunlar <= days; });
  return pkgs.length ? pkgs[pkgs.length - 1] : null;
}

/** Joriy versiyalar asosida taklif (sana = bugun yoki berilgan). kunlar — son yoki { kunlar } / { paket_id }. */
function quoteFor_(ratsionId, kunlar, opts) {
  var date = (opts && opts.date) || today_();
  var ratsion = mustGet_('Ratsionlar', ratsionId, 'Ratsion');
  if (!ratsion.faol) fail('Bu ratsion hozir sotuvda yo\'q');
  var price = priceRow_(ratsionId, date);
  if (!price) fail('Bu ratsion uchun narx belgilanmagan');
  var days = typeof kunlar === 'object' ? orderDays_(kunlar, date) : orderDays_({ kunlar: kunlar }, date);
  var pkg = packageForDays_(days, date);
  var rule = cashbackRule_(date);
  var q = calcQuote_({
    kunlar: days,
    kunlik_narx: price.kunlik_narx,
    chegirma_foiz: pkg ? pkg.chegirma_foiz : 0,
    keshbek_foiz: rule.foiz,
    max_ulush_foiz: rule.max_ulush_foiz,
    min_summa: rule.min_summa,
    use_cashback: !!(opts && opts.use_cashback),
    balans: (opts && opts.balans) || 0
  });
  q.ratsion_id = ratsionId;
  q.paket_id = pkg ? pkg.id : '';
  q.keshbek_muddat_kun = rule.amal_muddati_kun;
  return q;
}

/** Ratsion kaloriyasi matnidan son: "1200" → 1200, "900–1000" → 950. */
function kcalOf_(text) {
  var m = String(text || '').match(/\d+/g);
  if (!m) return 0;
  var a = Number(m[0]), b = m.length > 1 ? Number(m[1]) : a;
  return Math.round((a + b) / 2);
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
    max_kunlar: MAX_ORDER_DAYS,
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

// ===== 06_Cashback.js =====
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

// ===== 07_Orders.js =====
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

// ===== 08_Delivery.js =====
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

// ===== 09_Expenses.js =====
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

// ===== 10_Dashboard.js =====
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

// ===== 11_Clients.js =====
/**
 * Mijozlar: ro'yxatdan o'tish, profil, manzillar (6-bo'lim) va admin uchun mijoz kartasi (7-bo'lim).
 * Mijoz faqat o'z ma'lumotini ko'radi: mijoz id hech qachon so'rovdan olinmaydi, faqat Telegram ID dan.
 */

// ---------- Telegramdan ulashilgan telefon va joylashuv ----------

/** Bot webhook kontaktni oladi (faqat o'z raqami) va vaqtincha saqlaydi. */
function storeSharedContact_(tgId, phone) {
  CacheService.getScriptCache().put('contact_' + tgId, normPhone_(phone), 3600);
}

function sharedContact_(tgId) {
  return CacheService.getScriptCache().get('contact_' + tgId) || '';
}

function storeSharedLocation_(tgId, lat, lng) {
  CacheService.getScriptCache().put('loc_' + tgId, JSON.stringify({ lat: lat, lng: lng }), 3600);
}

function sharedLocation_(tgId) {
  var v = CacheService.getScriptCache().get('loc_' + tgId);
  return v ? JSON.parse(v) : null;
}

function phoneOwner_(phone) {
  var rows = all_('Mijozlar');
  for (var i = 0; i < rows.length; i++) if (rows[i].faol && rows[i].telefon === phone) return rows[i];
  return null;
}

function validRegion_(h) {
  var list = settingJson_('hududlar', []);
  var v = reqStr_(h, 'Hudud', 80);
  if (list.indexOf(v) < 0) fail('Hududni ro\'yxatdan tanlang');
  return v;
}

function addressRow_(p) {
  var lat = reqLat_(p.lat), lng = reqLng_(p.lng);
  if ((lat === '') !== (lng === '')) fail('Xaritadagi nuqta to\'liq emas');
  return {
    nom: optStr_(p.nom, 50) || 'Uy',
    lat: lat, lng: lng,
    matn: reqStr_(p.matn, 'Manzil matni', 300),
    moljal: optStr_(p.moljal, 200),
    hudud: validRegion_(p.hudud),
    faol: true
  };
}

// ---------- Ro'yxatdan o'tish (6.1, 1-ekran) ----------

/**
 * Telefon Telegram "raqamni ulashish" orqali (bot webhook) keladi — qo'lda yozilmaydi.
 * Telefon takrorlansa yangi akkaunt ochilmaydi (11.2). Rozilik majburiy (11.5).
 */
function register_(ctx, p) {
  if (ctx.user) fail('Siz allaqachon ro\'yxatdan o\'tgansiz');
  if (p.rozilik !== true) fail('Ma\'lumotlarni qayta ishlashga rozilik bering');
  var phone = sharedContact_(ctx.tgId);
  if (!phone) fail('Avval "Raqamni ulashish" tugmasini bosing', 'telefon');
  var ism = reqStr_(p.ism, 'Ism', 80);
  var manba = SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa';
  var addr = addressRow_(p.manzil || {});
  var actor = 'mijoz:' + ctx.tgId;
  var existing = phoneOwner_(phone);
  var client;
  if (existing) {
    // admin telefon orqali yaratgan mijoz — raqam egasi Telegram orqali tasdiqlandi, bog'laymiz
    if (existing.tg_id) fail('Bu telefon raqami boshqa akkauntga bog\'langan. Admin bilan bog\'laning');
    client = update_('Mijozlar', existing.id, {
      tg_id: ctx.tgId, ism: existing.ism || ism, rozilik_vaqt: nowIso_()
    }, actor, { amal: 'akkaunt_boglash' });
  } else {
    client = insert_('Mijozlar', {
      tg_id: ctx.tgId, ism: ism, telefon: phone, manba: manba, royxatdan_sana: today_(), holat: 'yangi',
      izoh: '', til: 'uz', rozilik_vaqt: nowIso_(), telefon_sorov: '', kim_yaratdi: 'mijoz', faol: true
    }, actor);
  }
  insert_('Foydalanuvchilar', { tg_id: ctx.tgId, rol: ROLES.CLIENT, ism: client.ism, faol: true, yaratilgan: nowIso_() }, actor);
  insert_('Manzillar', Object.assign({ mijoz_id: client.id }, addr), actor);
  CacheService.getScriptCache().remove('contact_' + ctx.tgId);
  notifyStaff_('👤 Yangi mijoz ro\'yxatdan o\'tdi: ' + client.ism + ' (' + phone + '), manba: ' + manba);
  return { ok: true };
}

// ---------- Mijoz kabineti ----------

function clientAddresses_(clientId) {
  return where_('Manzillar', function (a) { return a.mijoz_id === clientId && a.faol; }).map(function (a) {
    return pick_(a, ['id', 'nom', 'lat', 'lng', 'matn', 'moljal', 'hudud']);
  });
}

function clientOrders_(clientId) {
  return where_('Buyurtmalar', function (o) { return o.mijoz_id === clientId; })
    .sort(function (a, b) { return a.yaratilgan < b.yaratilgan ? 1 : -1; });
}

function menuFor_(date, ratsionId) {
  return where_('Menyu', function (m) {
    return m.faol && m.sana === date && (!ratsionId || m.ratsion_id === ratsionId);
  }).map(function (m) {
    var r = get_('Ratsionlar', m.ratsion_id) || {};
    return { ratsion_id: m.ratsion_id, ratsion: r.nom || '', taomlar: m.taomlar, kaloriya: m.kaloriya || r.kaloriya };
  });
}

/** Bosh sahifa (6.1, 2-ekran). */
function clientHome_(client) {
  var orders = clientOrders_(client.id);
  var active = orders.filter(function (o) { return o.holat === 'faol'; })[0] || null;
  var pending = orders.filter(function (o) { return o.holat === 'tolov_kutish'; });
  var t = today_();
  var rid = active ? active.ratsion_id : '';
  var av = null;
  if (active) {
    var v = orderView_(active, true);
    av = {
      id: v.id, ratsion: v.ratsion, kunlar: v.kunlar, boshlanish: v.boshlanish, tugash: v.tugash,
      qolgan_kun: v.qolgan_kun, yetkazildi: v.yetkazildi, pauza: v.pauza,
      foiz: v.kunlar ? Math.round((v.kunlar - v.qolgan_kun) / v.kunlar * 100) : 0,
      bugun: (v.kunlar_jadvali.filter(function (k) { return k.sana === t; })[0] || null),
      ertaga: (v.kunlar_jadvali.filter(function (k) { return k.sana === addDays_(t, 1); })[0] || null)
    };
  }
  return {
    ism: client.ism,
    faol_paket: av,
    tolov_kutilmoqda: pending.map(function (o) {
      var v = orderView_(o, true);
      return { id: v.id, ratsion: v.ratsion, kunlar: v.kunlar, tolanadi: v.tolanadi, tolangan: v.tolangan,
        narx_muddati: v.narx_muddati, chek_yuborilgan: v.tolovlar.some(function (p) { return p.holat === 'kutilmoqda'; }) };
    }),
    menyu_kuni: { bugun: menuDayOf_(t), ertaga: menuDayOf_(addDays_(t, 1)) },
    katalog_bor: catalogList_().length > 0,
    salomatlik: (function () {
      var hv = healthView_(client);
      return { toliq: hv.toliq, kkal: hv.kkal, tavsiya: hv.tavsiya, sorash_kerak: hv.sorash_kerak, statistika: hv.statistika };
    })(),
    keshbek: cashbackBalance_(client.id),
    karta: { raqam: setting_('karta_raqami'), egasi: setting_('karta_egasi') },
    aloqa: setting_('aloqa_telefon'),
    yetkazish_vaqti: setting_('yetkazish_vaqti')
  };
}

/** Buyurtma berish ekrani uchun: katalog, eng erta sana, manzillar, keshbek. */
function orderForm_(client) {
  var off = offDays_();
  var min = earliestStart_(off);
  var cal = dateRange_(min, addDays_(min, 30)).map(function (d) { return { sana: d, ish_kuni: isWorkDay_(d, off) }; });
  return {
    katalog: catalog_(),
    eng_erta: min,
    kalendar: cal,
    kesish_vaqti: setting_('kesish_vaqti'),
    manzillar: clientAddresses_(client.id),
    hududlar: settingJson_('hududlar', []),
    keshbek_balans: cashbackBalance_(client.id),
    karta: { raqam: setting_('karta_raqami'), egasi: setting_('karta_egasi') }
  };
}

function quoteForClient_(client, p) {
  var q = quoteFor_(p.ratsion_id, p, { use_cashback: !!p.use_cashback, balans: cashbackBalance_(client.id) });
  var off = offDays_();
  var min = earliestStart_(off);
  var start = p.boshlanish && parseDate_(p.boshlanish) && p.boshlanish >= min ? p.boshlanish : min;
  var dates = deliveryDates_(start, q.kunlar, off);
  q.boshlanish = dates[0];
  q.tugash = dates[dates.length - 1];
  return q;
}

function clientOwnOrder_(ctx, orderId) {
  var o = mustGet_('Buyurtmalar', orderId, 'Buyurtma');
  // boshqa mijozning buyurtmasi — "topilmadi" (mavjudligini ham oshkor qilmaymiz)
  if (o.mijoz_id !== ctx.client.id) fail('Buyurtma topilmadi', 'topilmadi');
  return o;
}

function clientOwnAddress_(ctx, id) {
  var a = mustGet_('Manzillar', id, 'Manzil');
  if (a.mijoz_id !== ctx.client.id || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  return a;
}

function addressSave_(ctx, clientId, p) {
  var row = addressRow_(p);
  if (p.id) {
    var a = mustGet_('Manzillar', p.id, 'Manzil');
    if (a.mijoz_id !== clientId || !a.faol) fail('Manzil topilmadi', 'topilmadi');
    update_('Manzillar', a.id, row, actor_(ctx));
    // kelgusi yetkazishlarda hudud yangilanadi
    where_('Buyurtmalar', function (o) { return o.manzil_id === a.id && o.holat === 'faol'; }).forEach(function (o) {
      orderDeliveries_(o.id).forEach(function (d) {
        if (d.holat === 'rejada' && d.sana > today_() && d.hudud !== row.hudud) {
          update_('Yetkazishlar', d.id, { hudud: row.hudud, kuryer_id: courierFor_(row.hudud) || d.kuryer_id }, actor_(ctx), { audit: false });
        }
      });
    });
    return a;
  }
  var count = where_('Manzillar', function (x) { return x.mijoz_id === clientId && x.faol; }).length;
  if (count >= 10) fail('Ko\'pi bilan 10 ta manzil');
  return insert_('Manzillar', Object.assign({ mijoz_id: clientId }, row), actor_(ctx));
}

function addressRemove_(ctx, clientId, id) {
  var a = mustGet_('Manzillar', id, 'Manzil');
  if (a.mijoz_id !== clientId || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  var used = where_('Buyurtmalar', function (o) {
    return o.manzil_id === id && (o.holat === 'faol' || o.holat === 'tolov_kutish');
  }).length;
  if (used) fail('Bu manzil faol buyurtmada ishlatilmoqda');
  update_('Manzillar', id, { faol: false }, actor_(ctx));
  return { ok: true };
}

/** Buyurtma manzilini almashtirish (faqat kelgusi kunlarga ta'sir qiladi). */
function orderChangeAddress_(ctx, order, addressId, minDate) {
  var a = mustGet_('Manzillar', addressId, 'Manzil');
  if (a.mijoz_id !== order.mijoz_id || !a.faol) fail('Manzil topilmadi', 'topilmadi');
  update_('Buyurtmalar', order.id, { manzil_id: a.id }, actor_(ctx));
  orderDeliveries_(order.id).forEach(function (d) {
    if (d.holat === 'rejada' && d.sana >= minDate) {
      update_('Yetkazishlar', d.id, { hudud: a.hudud, kuryer_id: courierFor_(a.hudud) || d.kuryer_id }, actor_(ctx), { audit: false });
    }
  });
  return { ok: true };
}

function profileView_(client) {
  return {
    ism: client.ism, telefon: client.telefon, til: client.til || 'uz', manba: client.manba,
    royxatdan_sana: client.royxatdan_sana, telefon_sorov: client.telefon_sorov
  };
}

function profileUpdate_(ctx, p) {
  var patch = {};
  if (p.ism !== undefined) patch.ism = reqStr_(p.ism, 'Ism', 80);
  if (p.til !== undefined) patch.til = p.til === 'ru' ? 'ru' : 'uz';
  update_('Mijozlar', ctx.client.id, patch, actor_(ctx));
  if (patch.ism) update_('Foydalanuvchilar', ctx.user.id, { ism: patch.ism }, actor_(ctx));
  return profileView_(ctx.client);
}

/** Telefon bir martalik; o'zgartirish faqat admin orqali (6.4). */
function requestPhoneChange_(ctx, p) {
  var phone = normPhone_(p.telefon);
  if (phone === ctx.client.telefon) fail('Bu sizning hozirgi raqamingiz');
  update_('Mijozlar', ctx.client.id, { telefon_sorov: phone }, actor_(ctx), { amal: 'telefon_sorov' });
  notifyStaff_('📞 Telefon o\'zgartirish so\'rovi: ' + ctx.client.ism + ' ' + ctx.client.telefon + ' → ' + phone);
  return { ok: true };
}

// ---------- Admin: mijozlar ----------

function clientRow_(c) {
  return {
    id: c.id, ism: c.ism, telefon: c.telefon, manba: c.manba, holat: c.holat,
    holat_nomi: CLIENT_STATUS[c.holat] || c.holat, royxatdan_sana: c.royxatdan_sana,
    telefon_sorov: c.telefon_sorov, telegram: !!c.tg_id, izoh: c.izoh, faol: c.faol
  };
}

function clientsSearch_(p) {
  var q = String(p.q || '').toLowerCase().trim();
  var digits = q.replace(/\D/g, '');
  var rows = all_('Mijozlar').filter(function (c) {
    if (!c.faol && !p.hammasi) return false;
    if (p.holat && c.holat !== p.holat) return false;
    if (p.manba && c.manba !== p.manba) return false;
    if (p.telefon_sorov && !c.telefon_sorov) return false;
    if (!q) return true;
    return String(c.ism).toLowerCase().indexOf(q) >= 0 || (digits.length >= 3 && String(c.telefon).replace(/\D/g, '').indexOf(digits) >= 0);
  });
  rows.sort(function (a, b) { return a.royxatdan_sana < b.royxatdan_sana ? 1 : -1; });
  var total = rows.length;
  return { jami: total, items: rows.slice(0, 100).map(clientRow_), manbalar: SOURCES, holatlar: CLIENT_STATUS };
}

function clientDetail_(id) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var cb = cashbackSummary_(c.id);
  return {
    mijoz: clientRow_(c),
    buyurtmalar: clientOrders_(c.id).map(function (o) {
      var r = get_('Ratsionlar', o.ratsion_id) || {};
      return {
        id: o.id, ratsion: r.nom, kunlar: o.kunlar, boshlanish: o.boshlanish, tugash: o.tugash,
        holat: o.holat, holat_nomi: ORDER_STATUS[o.holat], tolanadi: o.tolanadi, tolov_holati: o.tolov_holati,
        kim_yaratdi: o.kim_yaratdi, yaratilgan: o.yaratilgan
      };
    }),
    manzillar: clientAddresses_(c.id),
    keshbek: cb,
    salomatlik: (function () {
      var hv = healthView_(c);
      return {
        toliq: hv.toliq, kkal: hv.kkal, tavsiya: hv.tavsiya, statistika: hv.statistika, tarix: hv.tarix,
        maqsad: (GOALS[c.maqsad] || {}).nom || '', faollik: (ACTIVITY[c.faollik] || {}).nom || '',
        boy: c.boy || '', vazn: c.vazn || '', jins: c.jins, tugilgan_yil: c.tugilgan_yil || ''
      };
    })(),
    hududlar: settingJson_('hududlar', []),
    manbalar: SOURCES
  };
}

/** Operator yoki sherik telefon orqali yozgan mijozni qo'shadi. */
function clientCreate_(ctx, p) {
  var phone = normPhone_(p.telefon);
  if (phoneOwner_(phone)) fail('Bu telefon raqami bilan mijoz allaqachon bor');
  var c = insert_('Mijozlar', {
    tg_id: '', ism: reqStr_(p.ism, 'Ism', 80), telefon: phone,
    manba: SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa', royxatdan_sana: today_(), holat: 'yangi',
    izoh: optStr_(p.izoh, 500), til: 'uz', rozilik_vaqt: '', telefon_sorov: '', kim_yaratdi: 'admin', faol: true
  }, actor_(ctx));
  if (p.manzil && p.manzil.matn) insert_('Manzillar', Object.assign({ mijoz_id: c.id }, addressRow_(p.manzil)), actor_(ctx));
  return clientRow_(c);
}

function clientUpdate_(ctx, id, p) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var patch = {};
  if (p.ism !== undefined) patch.ism = reqStr_(p.ism, 'Ism', 80);
  if (p.manba !== undefined) patch.manba = SOURCES.indexOf(p.manba) >= 0 ? p.manba : 'Boshqa';
  if (p.izoh !== undefined) patch.izoh = optStr_(p.izoh, 500);
  if (p.telefon !== undefined) {
    var phone = normPhone_(p.telefon);
    var owner = phoneOwner_(phone);
    if (owner && owner.id !== c.id) fail('Bu raqam boshqa mijozda bor');
    patch.telefon = phone;
  }
  update_('Mijozlar', c.id, patch, actor_(ctx), { amal: 'mijoz_tahrir' });
  if (patch.ism && c.tg_id) {
    all_('Foydalanuvchilar').forEach(function (u) {
      if (u.tg_id === c.tg_id && u.rol === ROLES.CLIENT) update_('Foydalanuvchilar', u.id, { ism: patch.ism }, actor_(ctx));
    });
  }
  return clientRow_(c);
}

function phoneChangeDecide_(ctx, id, approve) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  if (!c.telefon_sorov) fail('So\'rov yo\'q');
  var actor = actor_(ctx);
  if (approve) {
    var owner = phoneOwner_(c.telefon_sorov);
    if (owner && owner.id !== c.id) fail('Bu raqam boshqa mijozda bor');
    update_('Mijozlar', c.id, { telefon: c.telefon_sorov, telefon_sorov: '' }, actor, { amal: 'telefon_ozgardi', muhim: 'telefon' });
    notifyClient_(c.id, '📞 Telefon raqamingiz yangilandi: ' + c.telefon);
  } else {
    update_('Mijozlar', c.id, { telefon_sorov: '' }, actor, { amal: 'telefon_rad' });
    notifyClient_(c.id, '📞 Telefon raqamini o\'zgartirish so\'rovi rad etildi. Savollar bo\'lsa biz bilan bog\'laning.');
  }
  return clientRow_(c);
}

/** Keshbekni qo'lda to'g'rilash: izoh majburiy, Auditga alohida belgi bilan yoziladi (7, 11.3). */
function cashbackAdjust_(ctx, clientId, p) {
  var c = mustGet_('Mijozlar', clientId, 'Mijoz');
  var izoh = reqStr_(p.izoh, 'Izoh', 300);
  var n = Number(p.summa);
  if (!isFinite(n) || Math.round(n) !== n || n === 0) fail('Summa noldan farqli butun son bo\'lishi kerak');
  var max = settingNum_('max_summa');
  if (Math.abs(n) > max) fail('Summa juda katta');
  var actor = actor_(ctx);
  if (n > 0) {
    cbCredit_(c.id, '', n, 'tuzatish', izoh, actor, { muhim: 'keshbek_tuzatish' });
  } else {
    var bal = cashbackBalance_(c.id);
    if (-n > bal) fail('Balansdan ko\'p ayirib bo\'lmaydi (balans ' + bal + ')');
    cbInsert_({ mijoz_id: c.id, buyurtma_id: '', tur: 'tuzatish', summa: n, izoh: izoh }, actor, { muhim: 'keshbek_tuzatish' });
  }
  return cashbackSummary_(c.id);
}

/**
 * Mijoz ma'lumotini o'chirishni so'rasa: shaxsiy maydonlar anonimlashtiriladi,
 * buyurtma va pul yozuvlari hisob uchun qoladi (11.5).
 */
function clientAnonymize_(ctx, id) {
  var c = mustGet_('Mijozlar', id, 'Mijoz');
  var active = where_('Buyurtmalar', function (o) {
    return o.mijoz_id === c.id && (o.holat === 'faol' || o.holat === 'tolov_kutish');
  }).length;
  if (active) fail('Mijozda faol buyurtma bor. Avval uni yakunlang yoki bekor qiling');
  var actor = actor_(ctx);
  var tg = c.tg_id;
  update_('Mijozlar', c.id, {
    ism: 'Anonim-' + c.id.slice(0, 4), telefon: '', tg_id: '', izoh: '', telefon_sorov: '', faol: false
  }, actor, { amal: 'anonimlashtirish', muhim: 'shaxsiy' });
  where_('Manzillar', function (a) { return a.mijoz_id === c.id; }).forEach(function (a) {
    update_('Manzillar', a.id, { matn: '—', moljal: '', lat: '', lng: '', faol: false }, actor, { amal: 'anonimlashtirish' });
  });
  if (tg) {
    all_('Foydalanuvchilar').forEach(function (u) {
      if (u.tg_id === tg && u.rol === ROLES.CLIENT) update_('Foydalanuvchilar', u.id, { faol: false, tg_id: '', ism: 'Anonim' }, actor);
    });
  }
  return { ok: true };
}

// ===== 12_Admin.js =====
/**
 * Admin panel (7-bo'lim): Bugun, buyurtmalar ro'yxati, menyu, narx va paketlar,
 * keshbek qoidasi, foydalanuvchilar, sozlamalar, audit.
 */

/** "Bugun" ekrani: nima ish kutayotganini darhol ko'rsatadi. */
function adminToday_(ctx) {
  var t = today_();
  var tomorrow = addDays_(t, 1);
  var orders = all_('Buyurtmalar');
  var pendingOrders = orders.filter(function (o) { return o.holat === 'tolov_kutish'; });
  var pendingPays = where_('Tolovlar', function (p) { return p.holat === 'kutilmoqda'; });
  var todayD = where_('Yetkazishlar', function (d) {
    return d.sana === t && (d.holat === 'rejada' || d.holat === 'yetkazildi' || d.holat === 'yetkazilmadi');
  });
  var endOfDay = hmToMin_(nowHM_()) >= hmToMin_(setting_('kun_oxiri_vaqti'));
  // kun oxirida belgilanmagan yetkazishlar qizil (8.4)
  var unmarked = where_('Yetkazishlar', function (d) {
    return d.holat === 'rejada' && (d.sana < t || (d.sana === t && endOfDay));
  }).map(function (d) {
    var c = deliveryCard_(d);
    c.kuryer = courierName_(d.kuryer_id);
    return c;
  });
  var unassigned = where_('Yetkazishlar', function (d) {
    return d.holat === 'rejada' && !d.kuryer_id && (d.sana === t || d.sana === tomorrow);
  }).length;
  var warnDays = settingNum_('paket_eslatma_kun') || 2;
  var expiring = orders.filter(function (o) { return o.holat === 'faol'; }).map(function (o) {
    return { o: o, left: remainingDays_(o.id) };
  }).filter(function (x) { return x.left <= warnDays; }).map(function (x) {
    var c = get_('Mijozlar', x.o.mijoz_id) || {};
    return { buyurtma_id: x.o.id, mijoz: c.ism, telefon: c.telefon, qolgan_kun: x.left, tugash: x.o.tugash };
  });
  var res = {
    sana: t,
    sozlash: {
      ratsion: all_('Ratsionlar').filter(function (r) { return r.faol && priceRow_(r.id, t); }).length,
      paket: activePackages_(t).length,
      katalog: catalogList_().length,
      karta: !!setting_('karta_raqami')
    },
    tolov_kutilmoqda: {
      buyurtmalar: pendingOrders.length,
      cheklar: pendingPays.length,
      items: pendingPays.map(function (p) {
        var o = get_('Buyurtmalar', p.buyurtma_id) || {};
        var c = get_('Mijozlar', o.mijoz_id) || {};
        return { tolov_id: p.id, buyurtma_id: o.id, mijoz: c.ism, summa: p.summa, usul: p.usul, chek: !!p.chek_rasm, sana: p.yaratilgan };
      })
    },
    bugun: {
      jami: todayD.length,
      yetkazildi: todayD.filter(function (d) { return d.holat === 'yetkazildi'; }).length,
      yetkazilmadi: todayD.filter(function (d) { return d.holat === 'yetkazilmadi'; }).length,
      qoldi: todayD.filter(function (d) { return d.holat === 'rejada'; }).length
    },
    ertaga: kitchenReport_(tomorrow),
    tugayotgan: expiring,
    belgilanmagan: unmarked,
    biriktirilmagan: unassigned,
    telefon_sorovlar: all_('Mijozlar').filter(function (c) { return c.faol && c.telefon_sorov; }).length,
    kesish_vaqti: setting_('kesish_vaqti')
  };
  if (ctx.role === ROLES.PARTNER) {
    res.katta_xarajatlar = where_('Xarajatlar', function (x) { return x.faol && x.holat === 'tasdiq_kutilmoqda'; }).length;
  }
  return res;
}

/** Buyurtmalar ro'yxati va filtr (holat, sana, hudud, qidiruv). */
function ordersList_(p) {
  var q = String(p.q || '').toLowerCase().trim();
  var rows = all_('Buyurtmalar').filter(function (o) {
    if (p.holat && o.holat !== p.holat) return false;
    var created = String(o.yaratilgan).slice(0, 10);
    if (p.dan && (o.tugash < p.dan && created < p.dan)) return false;
    if (p.gacha && (o.boshlanish > p.gacha && created > p.gacha)) return false;
    if (p.hudud) {
      var a = get_('Manzillar', o.manzil_id) || {};
      if (a.hudud !== p.hudud) return false;
    }
    if (p.chek && !orderPayments_(o.id).some(function (x) { return x.holat === 'kutilmoqda'; })) return false;
    if (q) {
      var c = get_('Mijozlar', o.mijoz_id) || {};
      if (String(c.ism).toLowerCase().indexOf(q) < 0 && String(c.telefon).indexOf(q.replace(/\D/g, '') || '@@') < 0 && o.id !== q) return false;
    }
    return true;
  }).sort(function (a, b) { return a.yaratilgan < b.yaratilgan ? 1 : -1; });
  return {
    jami: rows.length,
    items: rows.slice(0, 200).map(function (o) {
      var c = get_('Mijozlar', o.mijoz_id) || {};
      var r = get_('Ratsionlar', o.ratsion_id) || {};
      var a = get_('Manzillar', o.manzil_id) || {};
      return {
        id: o.id, mijoz: c.ism, telefon: c.telefon, ratsion: r.nom, kunlar: o.kunlar,
        boshlanish: o.boshlanish, tugash: o.tugash, holat: o.holat, holat_nomi: ORDER_STATUS[o.holat],
        tolov_holati: o.tolov_holati, tolov_holati_nomi: PAY_STATUS[o.tolov_holati], tolanadi: o.tolanadi,
        hudud: a.hudud, kim_yaratdi: o.kim_yaratdi, yaratilgan: o.yaratilgan,
        chek_kutilmoqda: orderPayments_(o.id).some(function (x) { return x.holat === 'kutilmoqda'; })
      };
    }),
    holatlar: ORDER_STATUS,
    hududlar: settingJson_('hududlar', [])
  };
}

// ---------- Foydalanuvchilar (faqat sherik) ----------

var STAFF_ROLES = [ROLES.PARTNER, ROLES.OPERATOR, ROLES.COURIER];

function usersList_() {
  return {
    items: all_('Foydalanuvchilar').filter(function (u) { return u.rol !== ROLES.CLIENT; }).map(function (u) {
      return pick_(u, ['id', 'tg_id', 'rol', 'ism', 'faol', 'yaratilgan']);
    }),
    rollar: STAFF_ROLES
  };
}

function userSave_(ctx, p) {
  var actor = actor_(ctx);
  if (STAFF_ROLES.indexOf(p.rol) < 0) fail('Rolni tanlang');
  var ism = reqStr_(p.ism, 'Ism', 80);
  if (p.id) {
    var u = mustGet_('Foydalanuvchilar', p.id, 'Foydalanuvchi');
    if (u.rol === ROLES.CLIENT) fail('Mijoz rolini bu yerda o\'zgartirib bo\'lmaydi');
    if (u.id === ctx.user.id && p.rol !== ROLES.PARTNER) fail('O\'z rolingizni pasaytira olmaysiz');
    return update_('Foydalanuvchilar', u.id, { rol: p.rol, ism: ism }, actor, { amal: 'rol_ozgartirish', muhim: 'rol' });
  }
  var tg = String(p.tg_id || '').replace(/\D/g, '');
  if (!tg || tg.length < 5) fail('Telegram ID noto\'g\'ri (faqat raqam)');
  var existing = all_('Foydalanuvchilar').filter(function (x) { return x.tg_id === tg && x.faol; })[0];
  if (existing) fail('Bu Telegram ID allaqachon "' + existing.rol + '" rolida');
  return insert_('Foydalanuvchilar', { tg_id: tg, rol: p.rol, ism: ism, faol: true, yaratilgan: nowIso_() }, actor, { muhim: 'rol' });
}

function userDeactivate_(ctx, id) {
  var u = mustGet_('Foydalanuvchilar', id, 'Foydalanuvchi');
  if (u.rol === ROLES.CLIENT) fail('Mijozni bu yerdan o\'chirib bo\'lmaydi');
  if (u.id === ctx.user.id) fail('O\'zingizni o\'chira olmaysiz');
  if (u.rol === ROLES.PARTNER) {
    var partners = all_('Foydalanuvchilar').filter(function (x) { return x.rol === ROLES.PARTNER && x.faol; });
    if (partners.length <= 1) fail('Oxirgi sherikni o\'chirib bo\'lmaydi');
  }
  update_('Foydalanuvchilar', u.id, { faol: false }, actor_(ctx), { amal: 'rol_ochirish', muhim: 'rol' });
  if (u.rol === ROLES.COURIER) {
    // kelgusi yetkazishlar biriktirilmagan bo'lib qoladi
    where_('Yetkazishlar', function (d) { return d.kuryer_id === u.id && d.holat === 'rejada' && d.sana >= today_(); })
      .forEach(function (d) { update_('Yetkazishlar', d.id, { kuryer_id: '' }, actor_(ctx), { audit: false }); });
  }
  return { ok: true };
}

// ---------- Menyu ----------

function menuList_(p) {
  var from = p.dan || today_();
  var to = p.gacha || addDays_(from, 6);
  return {
    dan: from, gacha: to,
    items: where_('Menyu', function (m) { return m.faol && m.sana >= from && m.sana <= to; })
      .sort(function (a, b) { return a.sana < b.sana ? -1 : 1; })
      .map(function (m) {
        return { id: m.id, sana: m.sana, ratsion_id: m.ratsion_id, ratsion: (get_('Ratsionlar', m.ratsion_id) || {}).nom, taomlar: m.taomlar, kaloriya: m.kaloriya };
      }),
    ratsionlar: all_('Ratsionlar').filter(function (r) { return r.faol; }).map(function (r) { return pick_(r, ['id', 'nom', 'kaloriya']); })
  };
}

function menuSave_(ctx, p) {
  var row = {
    sana: reqDate_(p.sana, 'Sana'),
    ratsion_id: mustGet_('Ratsionlar', p.ratsion_id, 'Ratsion').id,
    taomlar: reqStr_(p.taomlar, 'Taomlar', 1000),
    kaloriya: p.kaloriya ? reqInt_(p.kaloriya, 'Kaloriya', 0, 10000) : 0,
    faol: true
  };
  if (p.id) {
    mustGet_('Menyu', p.id, 'Menyu');
    return update_('Menyu', p.id, row, actor_(ctx));
  }
  var dup = where_('Menyu', function (m) { return m.faol && m.sana === row.sana && m.ratsion_id === row.ratsion_id; })[0];
  if (dup) return update_('Menyu', dup.id, row, actor_(ctx));
  return insert_('Menyu', row, actor_(ctx));
}

function menuRemove_(ctx, id) {
  mustGet_('Menyu', id, 'Menyu');
  update_('Menyu', id, { faol: false }, actor_(ctx));
  return { ok: true };
}

// ---------- Narx va paketlar, keshbek qoidasi (faqat sherik) ----------

function pricingOverview_() {
  var t = today_();
  var rations = all_('Ratsionlar').map(function (r) {
    var cur = priceRow_(r.id, t);
    return {
      id: r.id, nom: r.nom, kaloriya: r.kaloriya, tavsif: r.tavsif, faol: r.faol,
      tannarx_ovqat: r.tannarx_ovqat, tannarx_qadoq_yetkazish: r.tannarx_qadoq_yetkazish, tannarx: rationCost_(r),
      joriy_narx: cur ? cur.kunlik_narx : 0,
      tarix: where_('Narxlar', function (n) { return n.ratsion_id === r.id; })
        .sort(function (a, b) { return a.qachondan < b.qachondan ? 1 : -1; })
        .map(function (n) { return pick_(n, ['id', 'kunlik_narx', 'qachondan', 'faol', 'yaratilgan']); })
    };
  });
  return {
    sana: t,
    ratsionlar: rations,
    paketlar_joriy: activePackages_(t).map(function (p) { return pick_(p, ['id', 'nom', 'kunlar', 'chegirma_foiz', 'qachondan']); }),
    paketlar_tarix: all_('Paketlar').slice().sort(function (a, b) { return a.kunlar - b.kunlar || (a.qachondan < b.qachondan ? 1 : -1); })
      .map(function (p) { return pick_(p, ['id', 'nom', 'kunlar', 'chegirma_foiz', 'qachondan', 'faol', 'yaratilgan']); }),
    keshbek_joriy: cashbackRule_(t),
    keshbek_tarix: all_('KeshbekQoida').slice().sort(function (a, b) { return a.qachondan < b.qachondan ? 1 : -1; }),
    ogohlantirishlar: marginWarnings_({})
  };
}

/** Saqlashdan oldin marja tekshiriladi; ogohlantirish bo'lsa tasdiq (tasdiq: true) talab qilinadi. */
function guardMargin_(warnings, p) {
  if (warnings.length && p.tasdiq !== true) {
    var e = new AppError('Marja qo\'riqchisi: narx tannarxdan past!', 'marja');
    e.data = { ogohlantirishlar: warnings };
    throw e;
  }
}

function rationSave_(ctx, p) {
  var row = {
    nom: reqStr_(p.nom, 'Nomi', 80),
    kaloriya: optStr_(p.kaloriya, 30),       // son yoki oraliq: "1200", "900–1000"
    tavsif: optStr_(p.tavsif, 2000),         // doimiy menyu / tavsif (mijozga ko'rinadi)
    tannarx_ovqat: reqMoney_(p.tannarx_ovqat || 0, 'Ovqat tannarxi', true),
    tannarx_qadoq_yetkazish: reqMoney_(p.tannarx_qadoq_yetkazish || 0, 'Qadoq va yetkazish tannarxi', true),
    faol: p.faol !== false
  };
  var actor = actor_(ctx);
  if (p.id) {
    mustGet_('Ratsionlar', p.id, 'Ratsion');
    guardMargin_(marginWarnings_({ ratsion_id: p.id, tannarx: row.tannarx_ovqat + row.tannarx_qadoq_yetkazish }), p);
    return update_('Ratsionlar', p.id, row, actor, { amal: 'ratsion_tahrir', muhim: 'narx' });
  }
  return insert_('Ratsionlar', row, actor, { muhim: 'narx' });
}

/** Yangi narx = yangi qator; eskisi o'chmaydi (5.2). */
function priceAdd_(ctx, p) {
  var r = mustGet_('Ratsionlar', p.ratsion_id, 'Ratsion');
  var price = reqMoney_(p.kunlik_narx, 'Kunlik narx');
  var from = reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() });
  guardMargin_(marginWarnings_({ ratsion_id: r.id, kunlik_narx: price, date: from }), p);
  return insert_('Narxlar', { ratsion_id: r.id, kunlik_narx: price, qachondan: from, faol: true, yaratilgan: nowIso_() },
    actor_(ctx), { amal: 'narx_qoshish', muhim: 'narx' });
}

function packageAdd_(ctx, p) {
  var days = reqInt_(p.kunlar, 'Kunlar', 1, 120);
  var disc = reqPercent_(p.chegirma_foiz || 0, 'Chegirma');
  var from = reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() });
  var faol = p.faol !== false;
  var row = { nom: optStr_(p.nom, 50) || (days + ' kunlik'), kunlar: days, chegirma_foiz: disc, qachondan: from, faol: faol, yaratilgan: nowIso_() };
  if (faol) guardMargin_(marginWarnings_({ paket: row, date: from }), p);
  return insert_('Paketlar', row, actor_(ctx), { amal: 'paket_qoshish', muhim: 'narx' });
}

function cashbackRuleAdd_(ctx, p) {
  var row = {
    foiz: reqPercent_(p.foiz, 'Keshbek foizi'),
    amal_muddati_kun: reqInt_(p.amal_muddati_kun, 'Amal muddati', 1, 3650),
    min_summa: reqMoney_(p.min_summa || 0, 'Minimal summa', true),
    max_ulush_foiz: reqPercent_(p.max_ulush_foiz || 0, 'Bitta buyurtmadagi chegara'),
    qachondan: reqDate_(p.qachondan || today_(), 'Qachondan', { min: today_() }),
    yaratilgan: nowIso_()
  };
  guardMargin_(marginWarnings_({ keshbek_foiz: row.foiz, date: row.qachondan }), p);
  return insert_('KeshbekQoida', row, actor_(ctx), { amal: 'keshbek_qoida', muhim: 'narx' });
}

// ---------- Sozlamalar, audit ----------

function settingsView_() {
  return { qiymatlar: settingsMap_(), standart: DEFAULT_SETTINGS };
}

function auditList_(p) {
  var rows = all_('Audit');
  var q = String(p.q || '').toLowerCase();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < 300; i--) {
    var a = rows[i];
    if (p.varaq && a.varaq !== p.varaq) continue;
    if (p.muhim && !a.muhim) continue;
    if (p.dan && a.vaqt.slice(0, 10) < p.dan) continue;
    if (p.gacha && a.vaqt.slice(0, 10) > p.gacha) continue;
    if (q && (a.kim + ' ' + a.amal + ' ' + a.yozuv_id + ' ' + a.yangi).toLowerCase().indexOf(q) < 0) continue;
    out.push(a);
  }
  return { items: out, varaqlar: Object.keys(SCHEMA) };
}

/** Chek rasmini ko'rish: to'lov cheki — sherik/operator, xarajat cheki — faqat sherik. */
function fileView_(ctx, p) {
  var fileId;
  if (p.tolov_id) {
    fileId = mustGet_('Tolovlar', p.tolov_id, 'To\'lov').chek_rasm;
  } else if (p.xarajat_id) {
    requireRole_(ctx, [ROLES.PARTNER]);
    fileId = mustGet_('Xarajatlar', p.xarajat_id, 'Xarajat').chek_rasm;
  }
  if (!fileId) fail('Rasm yo\'q');
  return { data: readImage_(fileId) };
}

// ---------- Oylik katalog (rasmlar) ----------

var CATALOG_MAX = 12;

function catalogList_() {
  var list = settingJson_('katalog', []);
  return Array.isArray(list) ? list : [];
}

/** Mijoz va xodimlar uchun: rasmlarning ochiq manzillari. */
function catalogView_() {
  var base = ENV_.PUBLIC_STORAGE_URL || '';
  return {
    rasmlar: catalogList_().map(function (x, i) {
      return { i: i, nom: x.nom || '', url: base + x.yol, yuklangan: x.yuklangan || '' };
    }),
    yangilangan: catalogList_().reduce(function (m, x) { return x.yuklangan > m ? x.yuklangan : m; }, '')
  };
}

function catalogAdd_(ctx, p) {
  var list = catalogList_();
  if (list.length >= CATALOG_MAX) fail('Katalogda ko\'pi bilan ' + CATALOG_MAX + ' ta rasm bo\'ladi');
  var yol = saveImage_(p.rasm, 'katalog', 'katalog');
  list.push({ yol: yol, nom: optStr_(p.nom, 80), yuklangan: today_() });
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}

/** Rasmni katalogdan olib tashlash (fayl Storage'da qoladi — hech narsa jismoniy o'chirilmaydi). */
function catalogRemove_(ctx, p) {
  var list = catalogList_();
  var i = Number(p.i);
  if (!(i >= 0 && i < list.length)) fail('Rasm topilmadi', 'topilmadi');
  list.splice(i, 1);
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}

function catalogMove_(ctx, p) {
  var list = catalogList_();
  var i = Number(p.i), j = i + (p.yon === 'yuqori' ? -1 : 1);
  if (!(i >= 0 && i < list.length && j >= 0 && j < list.length)) return catalogView_();
  var t = list[i]; list[i] = list[j]; list[j] = t;
  saveSettings_({ katalog: JSON.stringify(list) }, actor_(ctx));
  return catalogView_();
}

// ===== 13_Telegram.js =====
/**
 * Telegram bot: xabarlar navbati (6.3, 8.3), webhook mantiqi, chek rasmlari.
 * Xabarlar navbatga qo'yiladi va runtime ularni tranzaksiya muvaffaqiyatli tugagach yuboradi.
 * Rasmlar yopiq Supabase Storage bucket'iga (cheklar) yoziladi — Google Drive o'rniga.
 */

var NOTIFY_QUEUE = [];
/** Runtime o'rnatadi: { WEBAPP_URL, ADMIN_TG_IDS, ALLOW_TEST_SEED, PUBLIC_STORAGE_URL } — sir kalitlar bu yerga kelmaydi. */
var ENV_ = {};

function webAppUrl_() {
  return ENV_.WEBAPP_URL || '';
}

function openAppMarkup_(label) {
  var url = webAppUrl_();
  if (!url) return null;
  return { inline_keyboard: [[{ text: label || '🍽 Ilovani ochish', web_app: { url: url } }]] };
}

function queueMessage_(chatId, text, markup) {
  if (!chatId) return;
  var m = { chat_id: String(chatId), text: String(text).slice(0, 4000), disable_web_page_preview: true };
  if (markup) m.reply_markup = markup;
  NOTIFY_QUEUE.push(m);
}

function notifyClient_(clientId, text, markup) {
  var c = get_('Mijozlar', clientId);
  if (c && c.tg_id && c.faol) queueMessage_(c.tg_id, text, markup);
}

function notifyStaff_(text) {
  all_('Foydalanuvchilar').forEach(function (u) {
    if (u.faol && (u.rol === ROLES.PARTNER || u.rol === ROLES.OPERATOR)) queueMessage_(u.tg_id, text);
  });
}

function notifyPartners_(text, exceptUserId) {
  all_('Foydalanuvchilar').forEach(function (u) {
    if (u.faol && u.rol === ROLES.PARTNER && u.id !== exceptUserId) queueMessage_(u.tg_id, text);
  });
}

function fmtMoney_(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

var MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
var WEEKDAYS_UZ = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

function fmtDate_(s) {
  var d = parseDate_(s);
  if (!d) return s;
  return d.getUTCDate() + '-' + MONTHS_UZ[d.getUTCMonth()] + ' (' + WEEKDAYS_UZ[d.getUTCDay()] + ')';
}

// ---------- Rasmlar (yopiq Storage, 11.1) ----------

var IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** data:image/...;base64,... → "cheklar/<fayl>" yo'li. Yuklash runtime'da, DB yozuvidan oldin. */
function saveImage_(dataUrl, name, bucket) {
  var b = bucket || 'cheklar';
  var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) fail('Rasm formati noto\'g\'ri (JPG, PNG yoki WEBP)');
  var size = Math.floor(m[2].length * 3 / 4);
  if (size > IMAGE_MAX_BYTES) fail('Rasm juda katta (5 MB gacha)');
  var ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
  var path = String(name).replace(/[^A-Za-z0-9_-]/g, '_') + '_' + today_() + '_' + uid_() + '.' + ext;
  OPS.push({ op: 'upload', bucket: b, path: path, contentType: m[1], base64: m[2] });
  return b + '/' + path;
}

/** Rasmni o'qish runtime'da (asinxron): bu yerda faqat belgi qaytariladi. */
function readImage_(ref) {
  return { __file: ref };
}

// ---------- Webhook ----------

/**
 * Telegram yangilanishi. photoDataUrl — runtime oldindan yuklab bergan chek rasmi (bo'lsa).
 * Takror kelgan yangilanish (update_id foydalanuvchining oxirgisidan katta emas) e'tiborsiz qoldiriladi.
 */
function handleTelegramUpdate_(update, photoDataUrl) {
  var msg = update.message;
  if (!msg || !msg.from || !msg.chat || msg.chat.type !== 'private') return;
  var tgId = String(msg.from.id);
  var cache = CacheService.getScriptCache();
  var key = 'upd_' + tgId;
  var last = Number(cache.get(key) || 0);
  if (update.update_id && Number(update.update_id) <= last) return;
  cache.put(key, String(update.update_id || 0), 30 * 86400);
  var text = String(msg.text || '').trim();

  if (msg.contact) {
    if (String(msg.contact.user_id || '') !== tgId) {
      queueMessage_(tgId, '❗️ Iltimos, faqat o\'z raqamingizni "📱 Raqamni yuborish" tugmasi orqali yuboring.');
      return;
    }
    try {
      storeSharedContact_(tgId, msg.contact.phone_number);
      queueMessage_(tgId, '✅ Raqamingiz qabul qilindi. Ilovaga qaytib ro\'yxatdan o\'tishni davom ettiring.', openAppMarkup_());
    } catch (e) {
      queueMessage_(tgId, '❗️ Faqat O\'zbekiston raqamlari qabul qilinadi.');
    }
    return;
  }
  if (msg.location) {
    storeSharedLocation_(tgId, msg.location.latitude, msg.location.longitude);
    queueMessage_(tgId, '📍 Joylashuv qabul qilindi. Ilovada "Manzillarim" → "Telegramdagi joylashuv" tugmasini bosing va manzil matnini yozing.', openAppMarkup_());
    return;
  }
  if (msg.photo && msg.photo.length) {
    handleReceiptPhoto_(tgId, photoDataUrl);
    return;
  }
  if (text === '/id') {
    queueMessage_(tgId, 'Sizning Telegram ID: ' + tgId);
    return;
  }
  // /start va boshqa har qanday matn
  queueMessage_(tgId, "Assalomu alaykum! " + APP_NAME + " ga xush kelibsiz 🥗\n\n" +
    "Buyurtma berish, keshbek va paketingizni ko'rish uchun ilovani oching.", openAppMarkup_());
  queueMessage_(tgId, 'Ro\'yxatdan o\'tishda raqamingizni pastdagi tugma orqali yuboring:', {
    keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }], [{ text: '📍 Joylashuvni yuborish', request_location: true }]],
    resize_keyboard: true
  });
}

/** Zaxira yo'l: mijoz chek rasmini botga yuboradi → oxirgi to'lov kutayotgan buyurtmaga biriktiriladi. */
function handleReceiptPhoto_(tgId, photoDataUrl) {
  var client = clientByTg_(tgId);
  if (!client) { queueMessage_(tgId, 'Avval ilovada ro\'yxatdan o\'ting.', openAppMarkup_()); return; }
  var order = clientOrders_(client.id).filter(function (o) { return o.holat === 'tolov_kutish'; })[0];
  if (!order) { queueMessage_(tgId, 'To\'lov kutayotgan buyurtma topilmadi.'); return; }
  if (!photoDataUrl) { queueMessage_(tgId, 'Rasmni olib bo\'lmadi, ilova orqali yuboring.'); return; }
  var ctx = { tgId: tgId, user: { id: 'mijoz', ism: client.ism }, role: ROLES.CLIENT, client: client };
  try {
    submitPayment_(ctx, order, { usul: 'karta', chek: photoDataUrl, izoh: 'Bot orqali' });
    queueMessage_(tgId, '🧾 Chek qabul qilindi. Admin tasdiqlagach xabar beramiz.');
  } catch (e) {
    queueMessage_(tgId, '❗️ ' + e.message);
  }
}

// ===== 14_Jobs.js =====
/**
 * Avtomatik ishlar (Supabase pg_cron har 15 daqiqada "cron" funksiyasini chaqiradi).
 * Har bir ish kuniga bir marta bajariladi (kesh jadvalida belgi: job_<nom> = sana).
 *
 *  - tungi: keshbek muddati, tugagan paketlar, mijoz holatlari, zaxira nusxa (11.4)
 *  - ertalab: "Bugun ovqatingiz yo'lda" (6.3)
 *  - eslatmalar: paket tugashiga 2 kun, keshbek tugashiga 7 kun (6.3), har 15 kunda vazn so'rash
 *  - kesish vaqti: kuryer biriktirish, zaxira ro'yxat Telegram guruhga, oshxona hisoboti (8.2, 11.4)
 *  - har soat: 48 soatdan eski to'lanmagan buyurtmalar qayta hisoblanadi (5.2)
 */

function cronTick_() {
  var cache = CacheService.getScriptCache();
  var t = today_();
  var hm = hmToMin_(nowHM_());
  var ran = [];
  var run = function (name, fn) {
    var opsLen = OPS.length, notLen = NOTIFY_QUEUE.length;
    try {
      fn();
      ran.push(name);
    } catch (e) {
      // xato bo'lgan ishning yozuvlari bekor qilinadi, qolgan ishlar davom etadi
      OPS.length = opsLen;
      NOTIFY_QUEUE.length = notLen;
      console.error('Job ' + name + ' xatosi: ' + (e && e.stack || e));
      notifyPartners_('⚠️ Avtomatik ish "' + name + '" xato bilan tugadi: ' + (e && e.message || e));
    }
  };
  var once = function (name, atHm, fn) {
    var key = 'job_' + name;
    if (hm < hmToMin_(atHm) || cache.get(key) === t) return;
    cache.put(key, t, 3 * 86400);
    run(name, fn);
  };
  once('tungi', '00:05', jobNightly_);
  once('ertalab', setting_('ertalabki_xabar_vaqti'), jobMorning_);
  once('eslatma', setting_('eslatma_vaqti'), jobReminders_);
  once('vazn', setting_('eslatma_vaqti'), jobWeightAsk_);
  once('kesish', setting_('kesish_vaqti'), jobCutoff_);
  var hourVal = t + 'T' + nowHM_().slice(0, 2);
  if (cache.get('job_soat') !== hourVal) {
    cache.put('job_soat', hourVal, 2 * 86400);
    run('soat', jobStaleOrders_);
  }
  return { bajarildi: ran };
}

function jobNightly_() {
  withLock_(function () {
    cbExpireAll_();
    var t = today_();
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'faol'; }).forEach(function (o) {
      finishOrderIfDone_(o, 'tizim');
    });
    all_('Mijozlar').forEach(function (c) { if (c.faol) updateClientStatus_(c.id); });
    audit_('tizim', 'tungi_job', 'Sozlama', t, '', { ok: true });
  });
  backupNow_();
}

function jobMorning_() {
  var t = today_();
  var seen = {};
  where_('Yetkazishlar', function (d) { return d.sana === t && d.holat === 'rejada'; }).forEach(function (d) {
    if (seen[d.mijoz_id]) return;
    seen[d.mijoz_id] = true;
    notifyClient_(d.mijoz_id, '🥗 Bugun ovqatingiz yo\'lda! Yetkazish vaqti: ' + setting_('yetkazish_vaqti') + '.');
  });
}

function jobReminders_() {
  var t = today_();
  var days = settingNum_('paket_eslatma_kun') || 2;
  withLock_(function () {
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'faol' && !o.eslatma_yuborildi; }).forEach(function (o) {
      var left = remainingDays_(o.id);
      if (left > days) return;
      var nextAfter = where_('Buyurtmalar', function (x) {
        return x.mijoz_id === o.mijoz_id && x.id !== o.id && (x.holat === 'tolov_kutish' || (x.holat === 'faol' && x.boshlanish > o.tugash));
      }).length;
      if (!nextAfter) {
        notifyClient_(o.mijoz_id, '⏳ Paketingiz tugashiga ' + left + ' kun qoldi (oxirgi kun ' + fmtDate_(o.tugash) +
          '). Davom etasizmi? Uzoqroq paket olsangiz chegirma va keshbek ko\'proq!', openAppMarkup_('🔁 Davom ettirish'));
      }
      update_('Buyurtmalar', o.id, { eslatma_yuborildi: true }, 'tizim', { audit: false });
    });
  });
  var warn = settingNum_('keshbek_eslatma_kun') || 7;
  var target = addDays_(t, warn);
  var byClient = groupBy_(all_('KeshbekHarakat'), function (e) { return e.mijoz_id; });
  Object.keys(byClient).forEach(function (cid) {
    var sim = cashbackLots_(byClient[cid], t);
    var amount = sum_(sim.lots.filter(function (l) { return l.qoldiq > 0 && l.tugash === target; }), function (l) { return l.qoldiq; });
    if (amount > 0) {
      notifyClient_(cid, '💰 ' + fmtMoney_(amount) + ' so\'m keshbekingiz muddati ' + fmtDate_(target) +
        ' da tugaydi. Keyingi buyurtmada ishlating!', openAppMarkup_('🛒 Buyurtma berish'));
    }
  });
}

/** Kesish vaqti: ertangi ro'yxat yopiladi, kuryerlar biriktiriladi, zaxira ro'yxat guruhga yuboriladi. */
function jobCutoff_() {
  var tomorrow = addDays_(today_(), 1);
  withLock_(function () { autoAssign_(tomorrow); });
  sendBackupList_(tomorrow);
  var k = kitchenReport_(tomorrow);
  var lines = ['🍳 Oshxona hisoboti — ' + fmtDate_(tomorrow) + ': jami ' + k.jami + ' ta ratsion'];
  k.ratsionlar.forEach(function (r) { lines.push('• ' + r.ratsion + ': ' + r.soni + ' ta'); });
  notifyStaff_(lines.join('\n'));
}

/** Kuryer uchun zaxira: ilova ishlamay qolsa ham ro'yxat Telegram guruhda bo'ladi (11.4). */
function sendBackupList_(date) {
  var chat = setting_('kuryer_guruh_chat_id');
  if (!chat) return false;
  var text = backupListText_(date);
  // Telegram 4096 belgidan uzun xabarni qabul qilmaydi — bo'lib yuboramiz
  var parts = [];
  var cur = '';
  text.split('\n').forEach(function (line) {
    if ((cur + '\n' + line).length > 3800) { parts.push(cur); cur = line; } else { cur = cur ? cur + '\n' + line : line; }
  });
  if (cur) parts.push(cur);
  parts.forEach(function (p) { queueMessage_(chat, p); });
  return true;
}

function jobStaleOrders_() {
  withLock_(function () {
    all_('Buyurtmalar').filter(function (o) { return o.holat === 'tolov_kutish'; }).forEach(function (o) {
      refreshStaleOrder_(o, 'tizim');
    });
  });
}

/** Zaxira nusxa (11.4): runtime barcha jadvallarni JSON qilib yopiq "zaxira" bucket'iga yozadi. */
function backupNow_() {
  BACKUP_REQUESTED = true;
}

// ===== 15_Api.js =====
/**
 * API amallari jadvali (Supabase "api" Edge Function shu jadval bo'yicha ishlaydi).
 *
 * So'rov: { action, initData, payload }  →  { ok, data } | { ok:false, error, code }
 *
 * Har bir amal uchun ruxsat etilgan rollar shu yerda belgilangan va server har so'rovda
 * rolni qayta tekshiradi (2-bo'lim qoidasi). "w" = yozadigan amal (LockService ichida).
 */

var R_ANY = 'any', R_CLIENT = 'client', R_STAFF = 'staff', R_PARTNER = 'partner', R_COURIER = 'courier';

function staffOrder_(id) {
  return mustGet_('Buyurtmalar', id, 'Buyurtma');
}

var ACTIONS = {
  // ---- hamma (Telegram orqali kirgan) ----
  me: { r: R_ANY, fn: function (ctx) { return meView_(ctx); } },
  contactStatus: { r: R_ANY, fn: function (ctx) { return { telefon: sharedContact_(ctx.tgId) }; } },
  sharedLocation: { r: R_ANY, fn: function (ctx) { return sharedLocation_(ctx.tgId); } },
  register: { r: R_ANY, w: 1, fn: function (ctx, p) { return register_(ctx, p); } },

  // ---- mijoz kabineti (6-bo'lim) ----
  home: { r: R_CLIENT, fn: function (ctx) { return clientHome_(ctx.client); } },
  discounts: { r: R_CLIENT, fn: function () { return catalog_(); } },
  orderForm: { r: R_CLIENT, fn: function (ctx) { return orderForm_(ctx.client); } },
  quote: { r: R_CLIENT, fn: function (ctx, p) { return quoteForClient_(ctx.client, p); } },
  createOrder: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      return orderView_(createOrder_(ctx, ctx.client, p, 'mijoz'), true);
    }
  },
  submitPayment: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      var o = clientOwnOrder_(ctx, p.buyurtma_id);
      submitPayment_(ctx, o, p);
      return orderView_(o, true);
    }
  },
  cancelMyOrder: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      var o = clientOwnOrder_(ctx, p.buyurtma_id);
      if (o.holat !== 'tolov_kutish') fail('Faol buyurtmani bekor qilish uchun admin bilan bog\'laning');
      if (paidCash_(o.id) > 0) fail('To\'lov qabul qilingan. Bekor qilish uchun admin bilan bog\'laning');
      return cancelOrder_(ctx, o, 'Mijoz bekor qildi');
    }
  },
  myOrders: {
    r: R_CLIENT, fn: function (ctx) {
      return clientOrders_(ctx.client.id).map(function (o) { return orderView_(o, true); });
    }
  },
  orderDetail: { r: R_CLIENT, fn: function (ctx, p) { return orderView_(clientOwnOrder_(ctx, p.id), true); } },
  pauseDay: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      var o = clientOwnOrder_(ctx, p.buyurtma_id);
      pauseDay_(ctx, o, p.yetkazish_id, false);
      return orderView_(o, true);
    }
  },
  unpauseDay: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      var o = clientOwnOrder_(ctx, p.buyurtma_id);
      unpauseDay_(ctx, o, p.yetkazish_id, false);
      return orderView_(o, true);
    }
  },
  changeOrderAddress: {
    r: R_CLIENT, w: 1, fn: function (ctx, p) {
      var o = clientOwnOrder_(ctx, p.buyurtma_id);
      clientOwnAddress_(ctx, p.manzil_id);
      orderChangeAddress_(ctx, o, p.manzil_id, earliestChangeable_());
      return orderView_(o, true);
    }
  },
  cashback: { r: R_CLIENT, fn: function (ctx) { return cashbackSummary_(ctx.client.id); } },
  addresses: {
    r: R_CLIENT, fn: function (ctx) {
      return { items: clientAddresses_(ctx.client.id), hududlar: settingJson_('hududlar', []) };
    }
  },
  addressSave: { r: R_CLIENT, w: 1, fn: function (ctx, p) { addressSave_(ctx, ctx.client.id, p); return { items: clientAddresses_(ctx.client.id) }; } },
  addressRemove: { r: R_CLIENT, w: 1, fn: function (ctx, p) { addressRemove_(ctx, ctx.client.id, p.id); return { items: clientAddresses_(ctx.client.id) }; } },
  profile: { r: R_CLIENT, fn: function (ctx) { return profileView_(ctx.client); } },
  health: { r: R_CLIENT, fn: function (ctx) { return healthView_(ctx.client); } },
  healthSave: { r: R_CLIENT, w: 1, fn: function (ctx, p) { return healthSave_(ctx, ctx.client, p); } },
  profileUpdate: { r: R_CLIENT, w: 1, fn: function (ctx, p) { return profileUpdate_(ctx, p); } },
  requestPhoneChange: { r: R_CLIENT, w: 1, fn: function (ctx, p) { return requestPhoneChange_(ctx, p); } },

  // ---- admin panel: sherik va operator (7-bo'lim) ----
  adminToday: { r: R_STAFF, fn: function (ctx) { return adminToday_(ctx); } },
  weightStats: { r: R_STAFF, fn: function () { return weightStats_(); } },
  ordersList: { r: R_STAFF, fn: function (ctx, p) { return ordersList_(p); } },
  orderGet: { r: R_STAFF, fn: function (ctx, p) { return orderView_(staffOrder_(p.id), false); } },
  paymentConfirm: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var res = confirmPayment_(ctx, p.tolov_id, { summa: p.summa, faollashtirish: p.faollashtirish });
      return { already: res.already, buyurtma: orderView_(staffOrder_(res.payment.buyurtma_id), false) };
    }
  },
  paymentReject: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var pay = rejectPayment_(ctx, p.tolov_id, p.izoh);
      return orderView_(staffOrder_(pay.buyurtma_id), false);
    }
  },
  paymentAdd: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var o = staffOrder_(p.buyurtma_id);
      addPayment_(ctx, o, p);
      return orderView_(o, false);
    }
  },
  orderFormFor: {
    r: R_STAFF, fn: function (ctx, p) {
      var c = mustGet_('Mijozlar', p.mijoz_id, 'Mijoz');
      return orderForm_(c);
    }
  },
  quoteFor: {
    r: R_STAFF, fn: function (ctx, p) {
      return quoteForClient_(mustGet_('Mijozlar', p.mijoz_id, 'Mijoz'), p);
    }
  },
  orderCreate: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var c = mustGet_('Mijozlar', p.mijoz_id, 'Mijoz');
      if (!c.faol) fail('Mijoz faol emas');
      var o = createOrder_(ctx, c, p, 'admin');
      if (p.tolov && Number(p.tolov.summa) > 0) addPayment_(ctx, o, p.tolov);
      return orderView_(o, false);
    }
  },
  orderPause: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var o = staffOrder_(p.buyurtma_id);
      pauseDay_(ctx, o, p.yetkazish_id, true);
      return orderView_(o, false);
    }
  },
  orderUnpause: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var o = staffOrder_(p.buyurtma_id);
      unpauseDay_(ctx, o, p.yetkazish_id, true);
      return orderView_(o, false);
    }
  },
  orderCancelPreview: {
    r: R_STAFF, fn: function (ctx, p) {
      var pv = cancelPreview_(staffOrder_(p.id));
      delete pv._cancel; delete pv._lastConsumed;
      return pv;
    }
  },
  orderCancel: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var o = staffOrder_(p.id);
      var res = cancelOrder_(ctx, o, reqStr_(p.sabab, 'Sabab', 200));
      res.buyurtma = orderView_(o, false);
      return res;
    }
  },
  orderAddress: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      var o = staffOrder_(p.buyurtma_id);
      orderChangeAddress_(ctx, o, p.manzil_id, today_());
      return orderView_(o, false);
    }
  },
  clientsSearch: { r: R_STAFF, fn: function (ctx, p) { return clientsSearch_(p); } },
  clientGet: { r: R_STAFF, fn: function (ctx, p) { return clientDetail_(p.id); } },
  clientCreate: { r: R_STAFF, w: 1, fn: function (ctx, p) { return clientCreate_(ctx, p); } },
  clientUpdate: { r: R_STAFF, w: 1, fn: function (ctx, p) { return clientUpdate_(ctx, p.id, p); } },
  clientAddressSave: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      mustGet_('Mijozlar', p.mijoz_id, 'Mijoz');
      addressSave_(ctx, p.mijoz_id, p);
      return clientDetail_(p.mijoz_id);
    }
  },
  phoneChange: { r: R_STAFF, w: 1, fn: function (ctx, p) { return phoneChangeDecide_(ctx, p.id, p.tasdiq === true); } },
  cashbackAdjust: { r: R_STAFF, w: 1, fn: function (ctx, p) { return cashbackAdjust_(ctx, p.mijoz_id, p); } },
  menuList: { r: R_STAFF, fn: function (ctx, p) { return menuList_(p); } },
  menuSave: { r: R_STAFF, w: 1, fn: function (ctx, p) { return menuSave_(ctx, p); } },
  menuRemove: { r: R_STAFF, w: 1, fn: function (ctx, p) { return menuRemove_(ctx, p.id); } },
  deliveryBoard: { r: R_STAFF, fn: function (ctx, p) { return deliveryBoard_(p.sana); } },
  assignCourier: { r: R_STAFF, w: 1, fn: function (ctx, p) { return assignCourier_(ctx, p); } },
  deliveryMark: {
    r: R_STAFF, w: 1, fn: function (ctx, p) {
      return p.holat === 'yetkazildi' ? markDelivered_(ctx, p.id, p.izoh) : markFailed_(ctx, p.id, p.sabab, p.izoh);
    }
  },
  catalog: { r: R_ANY, fn: function () { return catalogView_(); } },
  catalogAdd: { r: R_STAFF, w: 1, fn: function (ctx, p) { return catalogAdd_(ctx, p); } },
  catalogRemove: { r: R_STAFF, w: 1, fn: function (ctx, p) { return catalogRemove_(ctx, p); } },
  catalogMove: { r: R_STAFF, w: 1, fn: function (ctx, p) { return catalogMove_(ctx, p); } },
  kitchen: { r: R_STAFF, fn: function (ctx, p) { return kitchenReport_(p.sana); } },
  fileView: { r: R_STAFF, fn: function (ctx, p) { return fileView_(ctx, p); } },

  // ---- faqat sheriklar ----
  pricing: { r: R_PARTNER, fn: function () { return pricingOverview_(); } },
  rationSave: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return rationSave_(ctx, p); } },
  priceAdd: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return priceAdd_(ctx, p); } },
  packageAdd: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return packageAdd_(ctx, p); } },
  cashbackRuleAdd: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return cashbackRuleAdd_(ctx, p); } },
  expenses: { r: R_PARTNER, fn: function (ctx, p) { return expensesList_(p); } },
  expenseAdd: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return expenseAdd_(ctx, p); } },
  expenseUpdate: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return expenseUpdate_(ctx, p.id, p); } },
  expenseRemove: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return expenseRemove_(ctx, p.id); } },
  expenseApprove: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return expenseApprove_(ctx, p.id); } },
  expenseReject: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return expenseReject_(ctx, p.id); } },
  categorySave: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return categorySave_(ctx, p); } },
  payroll: { r: R_PARTNER, fn: function (ctx, p) { return payrollMonth_(/^\d{4}-\d{2}$/.test(p.oy) ? p.oy : monthOf_(today_())); } },
  staffSave: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return staffSave_(ctx, p); } },
  salaryAdvance: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return salaryAdvance_(ctx, p); } },
  salaryDays: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return salarySetDays_(ctx, p); } },
  salaryPay: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return salaryPay_(ctx, p); } },
  dashboard: { r: R_PARTNER, fn: function (ctx, p) { return dashboard_(p); } },
  users: { r: R_PARTNER, fn: function () { return usersList_(); } },
  userSave: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return userSave_(ctx, p); } },
  userDeactivate: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return userDeactivate_(ctx, p.id); } },
  settings: { r: R_PARTNER, fn: function () { return settingsView_(); } },
  settingsSave: { r: R_PARTNER, w: 1, fn: function (ctx, p) { saveSettings_(p.qiymatlar || {}, actor_(ctx)); return settingsView_(); } },
  audit: { r: R_PARTNER, fn: function (ctx, p) { return auditList_(p); } },
  clientAnonymize: { r: R_PARTNER, w: 1, fn: function (ctx, p) { return clientAnonymize_(ctx, p.id); } },
  backupNow: { r: R_PARTNER, fn: function () { backupNow_(); return { ok: true }; } },
  sendBackupList: {
    r: R_PARTNER, fn: function (ctx, p) {
      var sent = sendBackupList_(p.sana || addDays_(today_(), 1));
      if (!sent) fail('Sozlamalarda kuryer guruhi chat ID kiritilmagan');
      return { ok: true };
    }
  },

  // ---- kuryer (8.3) ----
  courierToday: { r: R_COURIER, fn: function (ctx, p) { return courierList_(ctx, p.sana && p.sana <= today_() ? p.sana : today_()); } },
  courierOnTheWay: { r: R_COURIER, w: 1, fn: function (ctx, p) { return courierOnTheWay_(ctx, p.id); } },
  courierDelivered: { r: R_COURIER, w: 1, fn: function (ctx, p) { return markDelivered_(ctx, p.id, p.izoh); } },
  courierFailed: { r: R_COURIER, w: 1, fn: function (ctx, p) { return markFailed_(ctx, p.id, p.sabab, p.izoh); } }
};

function checkAccess_(ctx, r) {
  if (r === R_ANY) return;
  if (r === R_CLIENT) {
    requireRole_(ctx, [ROLES.CLIENT]);
    if (!ctx.client) fail('Mijoz profili topilmadi', 'ruxsat');
    return;
  }
  if (r === R_STAFF) return requireRole_(ctx, [ROLES.PARTNER, ROLES.OPERATOR]);
  if (r === R_PARTNER) return requireRole_(ctx, [ROLES.PARTNER]);
  if (r === R_COURIER) return requireRole_(ctx, [ROLES.COURIER]);
  fail('Ruxsat yo\'q', 'ruxsat');
}

function meView_(ctx) {
  var out = {
    rol: ctx.role,
    tg_id: ctx.tgId,
    ism: ctx.user ? ctx.user.ism : (ctx.tgUser.first_name || ''),
    royxatdan_otgan: !!ctx.user,
    user_id: ctx.user ? ctx.user.id : '',
    ilova: APP_NAME
  };
  if (!ctx.user) {
    out.royxat = {
      manbalar: SOURCES,
      hududlar: settingJson_('hududlar', []),
      rozilik_matni: setting_('rozilik_matni'),
      telefon: sharedContact_(ctx.tgId)
    };
  }
  if (ctx.role === ROLES.CLIENT && ctx.client) out.mijoz = profileView_(ctx.client);
  return out;
}

/**
 * Bitta amalni bajaradi (sinxron). Runtime oldin initData ni tekshiradi, jadvallarni yuklaydi,
 * keyin shu funksiyani chaqiradi va OPS navbatini tranzaksiyada yozadi.
 */
function runAction_(action, tgUser, payload) {
  var def = ACTIONS[action];
  if (!def) fail('Noma\'lum amal', 'amal');
  ensureAdmin_(String(tgUser.id), ENV_.ADMIN_TG_IDS || []);
  var ctx = resolveCtx_(tgUser);
  checkAccess_(ctx, def.r);
  var p = payload && typeof payload === 'object' ? payload : {};
  var data = def.fn(ctx, p);
  return data === undefined ? null : data;
}

/** Amal haqida: yozadimi (qulf kerakmi) va kimga ochiq. */
function actionInfo_(action) {
  var def = ACTIONS[action];
  return def ? { w: !!def.w, r: def.r } : null;
}

/** Xatoni javobga aylantirish. */
function errorResponse_(e) {
  if (e instanceof AppError) return { ok: false, error: e.message, code: e.code, data: e.data || null };
  console.error('API xatosi: ' + (e && e.stack || e));
  return { ok: false, error: 'Serverda xato yuz berdi. Qayta urinib ko\'ring', code: 'server' };
}

// ===== 16_Seed.js =====
/**
 * Boshlang'ich ma'lumotlar. Jadvallar, xarajat turkumlari — migratsiyalarda (supabase/migrations).
 * Bu yerda: TZ dagi misol narxlar (ixtiyoriy) va 100 mijoz / 300 buyurtmali sinov ma'lumoti.
 */

/**
 * TZ dagi misol qiymatlar — Ozish Express, 120 000 so'm/kun,
 * paketlar 6/12/24 kun (0/5/10%), keshbek 3%, 60 kun, buyurtmaning 30% gacha.
 * Keyin hammasi admin panel orqali o'zgartiriladi.
 */
function seedExample_() {
  dbReset_();
  var t = today_();
  if (!all_('Ratsionlar').length) {
    var r = insert_('Ratsionlar', {
      nom: 'Ozish Express', kaloriya: 1200, tavsif: 'Kuniga 5 mahal, ozish uchun',
      tannarx_ovqat: 44800, tannarx_qadoq_yetkazish: 22000, faol: true
    }, 'tizim');
    insert_('Narxlar', { ratsion_id: r.id, kunlik_narx: 120000, qachondan: t, faol: true, yaratilgan: nowIso_() }, 'tizim');
  }
  if (!all_('Paketlar').length) {
    insertMany_('Paketlar', [[6, 0], [12, 5], [24, 10]].map(function (p) {
      return { nom: p[0] + ' kunlik', kunlar: p[0], chegirma_foiz: p[1], qachondan: t, faol: true, yaratilgan: nowIso_() };
    }), 'tizim');
  }
  if (!all_('KeshbekQoida').length) {
    insert_('KeshbekQoida', { foiz: 3, amal_muddati_kun: 60, min_summa: 0, max_ulush_foiz: 30, qachondan: t, yaratilgan: nowIso_() }, 'tizim');
  }
  dbFlush_();
  return 'Misol ma\'lumotlar qo\'shildi';
}

/**
 * Sinov uchun: 100 ta mijoz va 300 ta buyurtma (12-bo'lim, tezlik mezoni).
 * FAQAT sinov jadvalida ishlating!
 */
function seedTestData_() {
  dbReset_();
  if (ENV_.ALLOW_TEST_SEED !== 'ha') {
    fail('Sinov ma\'lumoti faqat ALLOW_TEST_SEED=ha bo\'lganda qo\'shiladi');
  }
  seedExample_();
  dbReset_();
  var ratsion = all_('Ratsionlar')[0];
  var pkgs = activePackages_(today_());
  var hududlar = settingJson_('hududlar', []);
  var clients = [], addrs = [];
  for (var i = 0; i < 100; i++) {
    var cid = uid_();
    clients.push({ id: cid, tg_id: String(900000000 + i), ism: 'Test mijoz ' + (i + 1), telefon: '+99890' + ('0000000' + i).slice(-7),
      manba: SOURCES[i % SOURCES.length], royxatdan_sana: addDays_(today_(), -60 + (i % 50)), holat: 'yangi', izoh: '', til: 'uz',
      rozilik_vaqt: nowIso_(), telefon_sorov: '', kim_yaratdi: 'admin', faol: true });
    addrs.push({ id: uid_(), mijoz_id: cid, nom: 'Uy', lat: 41.3 + i / 1000, lng: 69.24 + i / 1000, matn: 'Test ko\'chasi ' + i,
      moljal: '', hudud: hududlar[i % hududlar.length], faol: true });
  }
  insertMany_('Mijozlar', clients, 'tizim');
  insertMany_('Manzillar', addrs, 'tizim');
  insertMany_('Foydalanuvchilar', clients.map(function (c) {
    return { tg_id: c.tg_id, rol: ROLES.CLIENT, ism: c.ism, faol: true, yaratilgan: nowIso_() };
  }), 'tizim');
  var orders = [], dels = [];
  var off = offDays_();
  for (var j = 0; j < 300; j++) {
    var p = pkgs[j % pkgs.length];
    var start = addDays_(today_(), -40 + (j % 45));
    var dates = deliveryDates_(start, p.kunlar, off);
    var jami = money_(p.kunlar * 120000 * (1 - p.chegirma_foiz / 100));
    var oid = uid_();
    var c = clients[j % 100], a = addrs[j % 100];
    orders.push({ id: oid, mijoz_id: c.id, manzil_id: a.id, ratsion_id: ratsion.id, paket_id: p.id, kunlar: p.kunlar,
      boshlanish: dates[0], tugash: dates[dates.length - 1], kunlik_narx: 120000, chegirma_foiz: p.chegirma_foiz,
      keshbek_foiz: 3, keshbek_muddat_kun: 60, keshbek_ishlatildi: 0, jami: jami, tolanadi: jami,
      kunlik_daromad: round2_(jami / p.kunlar), tolov_holati: 'tolangan', holat: dates[dates.length - 1] < today_() ? 'tugadi' : 'faol',
      kim_yaratdi: 'admin', yaratilgan: start + 'T10:00:00', narx_muddati: '', tolov_usuli: 'karta', izoh: 'test', qaytarilgan: 0 });
    dates.forEach(function (d) {
      dels.push({ id: uid_(), buyurtma_id: oid, mijoz_id: c.id, sana: d, holat: d < today_() ? 'yetkazildi' : 'rejada', sabab: '',
        kuryer_id: '', hudud: a.hudud, ratsion_id: ratsion.id, izoh: '', vaqt: '', yoldaman_vaqt: '' });
    });
  }
  insertMany_('Buyurtmalar', orders, 'tizim');
  insertMany_('Tolovlar', orders.map(function (o) {
    return { buyurtma_id: o.id, summa: o.tolanadi, usul: 'karta', sana: o.yaratilgan.slice(0, 10), holat: 'tasdiqlandi',
      tasdiqlagan: 'tizim', chek_rasm: '', izoh: 'test', yaratilgan: o.yaratilgan };
  }), 'tizim');
  for (var k = 0; k < dels.length; k += 2000) insertMany_('Yetkazishlar', dels.slice(k, k + 2000), 'tizim');
  dbFlush_();
  return 'Qo\'shildi: 100 mijoz, 300 buyurtma, ' + dels.length + ' yetkazish';
}

// ===== 17_Health.js =====
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


// ENV_ obyekt — runtime uning maydonlarini o'rnatadi
export { SCHEMA, TABLE_NAMES, ROLES, AppError, ENV_, dbInstall_, dbTake_, runAction_, actionInfo_, errorResponse_, handleTelegramUpdate_, cronTick_, seedExample_, seedTestData_, setting_, normalizeRow_ };
