/**
 * Jadval qatlami: Google Sheets varaqlarini obyekt sifatida o'qish/yozish.
 *
 * - Har so'rovda varaq bir marta o'qiladi va xotirada saqlanadi (DB_CACHE).
 * - Hech narsa o'chirilmaydi: "o'chirish" = faol = yo'q (4-bo'lim qoidasi).
 * - Har bir qo'shish va o'zgartirish Audit varag'iga yoziladi (11.3).
 */

var DB_CACHE = {};
var AUDIT_BUFFER = [];
var SS_CACHE = null;

function dbReset_() {
  DB_CACHE = {};
  AUDIT_BUFFER = [];
  SS_CACHE = null;
}

function ss_() {
  if (SS_CACHE) return SS_CACHE;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  SS_CACHE = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!SS_CACHE) fail('Baza (Spreadsheet) topilmadi. SPREADSHEET_ID ni sozlang.');
  return SS_CACHE;
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) fail('Varaq topilmadi: ' + name + '. setup() ni ishga tushiring.');
  return sh;
}

function colTypes_(name) {
  var map = {};
  (SCHEMA[name] || []).forEach(function (c) { map[c[0]] = c[1]; });
  return map;
}

function toCell_(v, type) {
  if (v === undefined || v === null) return '';
  switch (type) {
    case 'b': return v === true || v === 'ha' ? 'ha' : "yo'q";
    case 'j': return typeof v === 'string' ? v : JSON.stringify(v);
    case 'n': return v === '' ? '' : String(Math.round(Number(v) || 0));
    case 'f':
    case 'g': return v === '' ? '' : String(Number(v));
    default: return String(v);
  }
}

function fromCell_(v, type) {
  if (v instanceof Date) {
    if (type === 'd') return fmt_(v, 'yyyy-MM-dd');
    if (type === 't') return fmt_(v, "yyyy-MM-dd'T'HH:mm:ss");
  }
  switch (type) {
    case 'b': return v === true || v === 'ha' || v === 'TRUE' || v === 'true';
    case 'n':
    case 'f': return v === '' || v === null ? 0 : Number(v) || 0;
    case 'g': return v === '' || v === null ? '' : Number(v);
    case 'j':
      if (!v) return null;
      try { return JSON.parse(v); } catch (e) { return null; }
    default: return v === null || v === undefined ? '' : String(v);
  }
}

function table_(name) {
  if (DB_CACHE[name]) return DB_CACHE[name];
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var header = values.length ? values[0].map(String) : [];
  var types = colTypes_(name);
  var rows = [];
  var byId = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    var empty = true;
    for (var c = 0; c < header.length; c++) {
      if (!header[c]) continue;
      if (row[c] !== '' && row[c] !== null) empty = false;
      obj[header[c]] = fromCell_(row[c], types[header[c]] || 's');
    }
    if (empty) continue;
    Object.defineProperty(obj, '_row', { value: r + 1, writable: true, enumerable: false });
    rows.push(obj);
    if (obj.id) byId[obj.id] = obj;
  }
  DB_CACHE[name] = { name: name, header: header, types: types, rows: rows, byId: byId, sheet: sh };
  return DB_CACHE[name];
}

/** Barcha qatorlar (o'qish uchun; to'g'ridan-to'g'ri o'zgartirmang, update_ ishlating). */
function all_(name) {
  return table_(name).rows;
}

function where_(name, fn) {
  return table_(name).rows.filter(fn);
}

function get_(name, id) {
  return table_(name).byId[id] || null;
}

function mustGet_(name, id, what) {
  var x = id ? get_(name, id) : null;
  if (!x) fail((what || 'Yozuv') + ' topilmadi', 'topilmadi');
  return x;
}

function rowArray_(t, obj) {
  return t.header.map(function (h) { return toCell_(obj[h], t.types[h] || 's'); });
}

function normalize_(t, obj) {
  var out = {};
  t.header.forEach(function (h) {
    out[h] = fromCell_(toCell_(obj[h], t.types[h] || 's'), t.types[h] || 's');
  });
  return out;
}

/**
 * Bir nechta qatorni bitta yozish bilan qo'shadi.
 * actor = kim (foydalanuvchi id yoki "tizim"), opts.audit = false bo'lsa auditsiz.
 */
function insertMany_(name, objs, actor, opts) {
  if (!objs.length) return [];
  var t = table_(name);
  var o = opts || {};
  var start = t.sheet.getLastRow() + 1;
  var out = objs.map(function (obj) {
    var full = normalize_(t, Object.assign({ id: uid_() }, obj));
    if (t.header.indexOf('id') < 0) delete full.id;
    return full;
  });
  t.sheet.getRange(start, 1, out.length, t.header.length).setValues(out.map(function (x) { return rowArray_(t, x); }));
  out.forEach(function (x, i) {
    Object.defineProperty(x, '_row', { value: start + i, writable: true, enumerable: false });
    t.rows.push(x);
    if (x.id) t.byId[x.id] = x;
  });
  if (o.audit !== false && name !== 'Audit') {
    if (out.length === 1) {
      audit_(actor, o.amal || 'qoshish', name, out[0].id || out[0].kalit, '', out[0], o.muhim);
    } else {
      audit_(actor, o.amal || 'qoshish', name, out.map(function (x) { return x.id; }).join(','), '',
        { soni: out.length }, o.muhim);
    }
  }
  return out;
}

function insert_(name, obj, actor, opts) {
  return insertMany_(name, [obj], actor, opts)[0];
}

/** Qatorni yangilaydi; faqat o'zgargan maydonlar auditga yoziladi. */
function update_(name, id, patch, actor, opts) {
  var t = table_(name);
  var cur = t.byId[id];
  if (!cur) fail('Yozuv topilmadi: ' + name, 'topilmadi');
  return updateRow_(t, cur, patch, actor, opts, id);
}

function updateRow_(t, cur, patch, actor, opts, auditId) {
  var o = opts || {};
  var before = {}, after = {}, changed = false;
  Object.keys(patch).forEach(function (k) {
    if (k === 'id' || t.header.indexOf(k) < 0) return;
    var type = t.types[k] || 's';
    var nv = fromCell_(toCell_(patch[k], type), type);
    var ov = cur[k];
    if (JSON.stringify(nv) !== JSON.stringify(ov)) {
      before[k] = ov;
      after[k] = nv;
      cur[k] = nv;
      changed = true;
    }
  });
  if (!changed) return cur;
  t.sheet.getRange(cur._row, 1, 1, t.header.length).setValues([rowArray_(t, cur)]);
  if (o.audit !== false) audit_(actor, o.amal || 'ozgartirish', t.name, auditId, before, after, o.muhim);
  return cur;
}

/** Audit yozuvi; so'rov oxirida bitta yozish bilan saqlanadi (dbFlush_). */
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

function dbFlush_() {
  if (!AUDIT_BUFFER.length) return;
  var buf = AUDIT_BUFFER;
  AUDIT_BUFFER = [];
  insertMany_('Audit', buf, 'tizim', { audit: false });
}

/**
 * Pul yoki keshbek yozadigan amallar shu yerda bajariladi (11.2):
 * bir vaqtda ikki kishi yozsa navbat bilan ishlaydi, kesh yangidan o'qiladi.
 */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) fail('Tizim band, birozdan keyin qayta urinib ko\'ring', 'band');
  try {
    DB_CACHE = {}; // qulf ichida eng yangi ma'lumot bilan ishlaymiz
    return fn();
  } finally {
    // xato bo'lsa ham, bajarilgan yozuvlar auditga tushadi
    dbFlush_();
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}
