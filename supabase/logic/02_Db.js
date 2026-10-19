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
