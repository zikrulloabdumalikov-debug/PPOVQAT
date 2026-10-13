'use strict';
/**
 * Google Apps Script muhitining xotiradagi nusxasi (testlar va lokal dev server uchun).
 * backend/*.gs fayllari shu kontekstga yuklanadi va o'zgarishsiz ishlaydi.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const BACKEND = path.join(__dirname, '..', 'backend');
const TZ_OFFSET_MS = 5 * 3600 * 1000; // Asia/Tashkent = UTC+5, yozgi vaqt yo'q

function toBuf(x) {
  if (Buffer.isBuffer(x)) return x;
  if (Array.isArray(x)) return Buffer.from(x.map((b) => (b < 0 ? b + 256 : b)));
  return Buffer.from(String(x), 'utf8');
}
function toSigned(buf) {
  return Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
}

function formatDate(date, tz, pattern) {
  const d = new Date(date.getTime() + TZ_OFFSET_MS);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  const map = {
    yyyy: String(d.getUTCFullYear()), MM: p(d.getUTCMonth() + 1), dd: p(d.getUTCDate()),
    HH: p(d.getUTCHours()), mm: p(d.getUTCMinutes()), ss: p(d.getUTCSeconds())
  };
  let out = '';
  for (let i = 0; i < pattern.length;) {
    if (pattern[i] === "'") {
      const j = pattern.indexOf("'", i + 1);
      out += pattern.slice(i + 1, j);
      i = j + 1;
      continue;
    }
    const tok = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'].find((t) => pattern.startsWith(t, i));
    if (tok) { out += map[tok]; i += tok.length; } else { out += pattern[i++]; }
  }
  return out;
}

class Range {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) {
      const line = [];
      for (let c = 0; c < this.nc; c++) {
        const rowArr = this.sheet.data[this.row - 1 + r] || [];
        const v = rowArr[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some((r) => r.length !== this.nc)) throw new Error('setValues: o\'lcham mos emas');
    this.sheet.writes++;
    vals.forEach((line, r) => {
      const ri = this.row - 1 + r;
      while (this.sheet.data.length <= ri) this.sheet.data.push([]);
      line.forEach((v, c) => { this.sheet.data[ri][this.col - 1 + c] = v; });
    });
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.writes = 0; this.protections = []; }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.data.length - 1; r >= 0; r--) if ((this.data[r] || []).some((v) => v !== '' && v !== undefined)) return r + 1;
    return 0;
  }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r ? r.length : 0), 0); }
  getMaxRows() { return Math.max(1000, this.data.length); }
  getRange(row, col, nr = 1, nc = 1) { return new Range(this, row, col, nr, nc); }
  getDataRange() {
    const lr = Math.max(this.getLastRow(), 1), lc = Math.max(this.getLastColumn(), 1);
    return new Range(this, 1, 1, lr, lc);
  }
  setFrozenRows() { return this; }
  getProtections() { return this.protections; }
  protect() {
    const p = { setDescription() { return p; }, setWarningOnly() { return p; } };
    this.protections.push(p);
    return p;
  }
}

class Spreadsheet {
  constructor() { this.sheets = new Map(); this.id = 'ss_test'; }
  getId() { return this.id; }
  getName() { return 'Soglom Ovqatlar DB'; }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.set(n, s); return s; }
  getSheets() { return [...this.sheets.values()]; }
  deleteSheet(s) { this.sheets.delete(s.name); }
}

function createGas(opts = {}) {
  const props = new Map(Object.entries(opts.props || {}));
  const cache = new Map();
  const ss = new Spreadsheet();
  const sent = [];
  const files = new Map();
  const folders = new Map();
  const lockStats = { acquired: 0, held: false, maxDepth: 0 };
  let fileSeq = 0;

  const makeFile = (blob, name) => {
    const id = 'file_' + (++fileSeq);
    const f = {
      id, name, blob, created: new Date(), trashed: false,
      getId: () => id, getBlob: () => blob, getDateCreated: () => f.created,
      setTrashed: (v) => { f.trashed = v; },
      makeCopy: (n, folder) => folder.createFile(blob, n)
    };
    files.set(id, f);
    return f;
  };
  const makeFolder = (name) => {
    const id = 'folder_' + (++fileSeq);
    const list = [];
    const folder = {
      id, name, list,
      getId: () => id,
      createFile: (blob, n) => { const f = makeFile(blob, n || blob.getName()); list.push(f); return f; },
      getFiles: () => { const arr = list.filter((x) => !x.trashed); let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; }
    };
    folders.set(id, folder);
    return folder;
  };
  files.set(ss.id, {
    getId: () => ss.id,
    makeCopy: (n, folder) => folder.createFile(makeBlob(JSON.stringify([...ss.sheets.keys()]), 'application/json', n), n)
  });

  function makeBlob(data, mime, name) {
    const buf = toBuf(data);
    return {
      getBytes: () => toSigned(buf), getContentType: () => mime || 'application/octet-stream',
      getName: () => name || 'blob', getDataAsString: () => buf.toString('utf8')
    };
  }

  const sandbox = {
    console: opts.quiet === false ? console : { log() {}, error() {}, warn() {} },
    // realTime: true — haqiqiy soat (dev server); aks holda 2026-10-13 10:00 Toshkent
    __NOW__: opts.realTime ? 0 : (opts.now || Date.UTC(2026, 9, 13, 5, 0, 0)),
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
      flush: () => {},
      ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (lockStats.held) throw new Error('Qulf ichida qayta qulf olinmoqda');
          lockStats.held = true; lockStats.acquired++; return true;
        },
        waitLock: () => { lockStats.held = true; lockStats.acquired++; },
        releaseLock: () => { lockStats.held = false; }
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => { props.set(k, String(v)); },
        deleteProperty: (k) => { props.delete(k); },
        getKeys: () => [...props.keys()]
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => { cache.set(k, String(v)); },
        remove: (k) => { cache.delete(k); }
      })
    },
    Utilities: {
      formatDate,
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (value, key) => toSigned(crypto.createHmac('sha256', toBuf(key)).update(toBuf(value)).digest()),
      newBlob: makeBlob,
      base64Decode: (s) => toSigned(Buffer.from(s, 'base64')),
      base64Encode: (bytes) => toBuf(bytes).toString('base64')
    },
    UrlFetchApp: {
      fetch: (url, o) => {
        sent.push({ url, payload: o && o.payload ? JSON.parse(o.payload) : null });
        if (/\/getFile$/.test(url)) return { getContentText: () => JSON.stringify({ ok: true, result: { file_path: 'photos/x.jpg' } }) };
        return {
          getContentText: () => JSON.stringify({ ok: true, result: {} }),
          getBlob: () => makeBlob(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg', 'x.jpg')
        };
      },
      fetchAll: (reqs) => reqs.map((r) => { sent.push({ url: r.url, payload: JSON.parse(r.payload) }); return { getResponseCode: () => 200 }; })
    },
    DriveApp: {
      createFolder: (n) => makeFolder(n),
      getFolderById: (id) => { if (!folders.has(id)) throw new Error('folder yo\'q'); return folders.get(id); },
      getFileById: (id) => { if (!files.has(id)) throw new Error('fayl yo\'q'); return files.get(id); }
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => ({ content: s, setMimeType() { return this; }, getContent() { return s; } })
    },
    ScriptApp: {
      getProjectTriggers: () => [],
      deleteTrigger: () => {},
      newTrigger: () => { const c = { timeBased: () => c, everyMinutes: () => c, create: () => c }; return c; },
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' })
    }
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  fs.readdirSync(BACKEND).filter((f) => f.endsWith('.gs')).sort().forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(BACKEND, f), 'utf8'), context, { filename: f });
  });

  const gas = {
    ctx: context, ss, props, cache, sent, files, folders, lockStats,
    setNow(ms) { context.__NOW__ = ms; },
    /** Toshkent vaqti bilan: setTashkent('2026-10-13', '17:59') */
    setTashkent(date, hm = '10:00') {
      const [y, m, d] = date.split('-').map(Number);
      const [h, mi] = hm.split(':').map(Number);
      context.__NOW__ = Date.UTC(y, m - 1, d, h - 5, mi, 0);
    },
    call(fnName, ...args) { return context[fnName](...args); },
    rows(sheet) {
      context.dbReset_();
      return context.all_(sheet).map((r) => ({ ...r }));
    },
    clearSent() { sent.length = 0; }
  };
  return gas;
}

/** Telegram Mini App initData ni bot tokeni bilan imzolaydi (test va dev uchun). */
function signInitData(token, user, authDateSec, extra = {}) {
  const fields = { auth_date: String(authDateSec), query_id: 'AAE' + user.id, user: JSON.stringify(user), ...extra };
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  const qs = new URLSearchParams({ ...fields, hash });
  return qs.toString();
}

module.exports = { createGas, signInitData, formatDate };
