/**
 * Kirish va ruxsat (2, 11.1-bo'lim).
 *
 * Har so'rov Telegram initData bilan keladi. Server imzoni bot tokeni bilan
 * tekshiradi va 24 soatdan eski bo'lsa rad etadi. Rol faqat serverda,
 * Foydalanuvchilar varag'idan Telegram ID bo'yicha aniqlanadi.
 */

var INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;

function botToken_() {
  var t = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  if (!t) fail('BOT_TOKEN Script Properties da sozlanmagan');
  return t;
}

function bytesToHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function parseQuery_(qs) {
  var out = {};
  String(qs || '').split('&').forEach(function (pair) {
    if (!pair) return;
    var i = pair.indexOf('=');
    var k = i < 0 ? pair : pair.slice(0, i);
    var v = i < 0 ? '' : pair.slice(i + 1);
    try {
      out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch (e) {
      fail('Kirish ma\'lumoti buzilgan', 'auth');
    }
  });
  return out;
}

/**
 * Telegram Mini App initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Qaytaradi: Telegram user obyekti.
 */
function verifyInitData_(initData, token, nowMs) {
  if (!initData || typeof initData !== 'string' || initData.length > 4096) fail('Telegram orqali kiring', 'auth');
  var data = parseQuery_(initData);
  var hash = data.hash;
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) fail('Imzo yo\'q', 'auth');
  var keys = Object.keys(data).filter(function (k) { return k !== 'hash'; }).sort();
  var checkString = keys.map(function (k) { return k + '=' + data[k]; }).join('\n');
  var secret = Utilities.computeHmacSha256Signature(token, 'WebAppData');
  var calc = bytesToHex_(Utilities.computeHmacSha256Signature(
    Utilities.newBlob(checkString).getBytes(), secret));
  // doimiy vaqtli taqqoslash
  var diff = calc.length ^ hash.length;
  for (var i = 0; i < calc.length && i < hash.length; i++) diff |= calc.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) fail('Imzo noto\'g\'ri', 'auth');

  var authDate = Number(data.auth_date) || 0;
  var nowSec = Math.floor((nowMs || now_().getTime()) / 1000);
  if (!authDate || nowSec - authDate > INIT_DATA_MAX_AGE_SEC) fail('Sessiya eskirgan, ilovani qayta oching', 'auth');
  if (authDate - nowSec > 300) fail('Sessiya vaqti noto\'g\'ri', 'auth');

  var user;
  try { user = JSON.parse(data.user || 'null'); } catch (e) { user = null; }
  if (!user || !user.id) fail('Telegram foydalanuvchisi topilmadi', 'auth');
  return user;
}

/** So'rov konteksti: kim, qaysi rolda, mijoz bo'lsa uning yozuvi. */
function authenticate_(initData) {
  var tgUser = verifyInitData_(initData, botToken_());
  var tgId = String(tgUser.id);
  rateLimit_(tgId);
  var user = null;
  all_('Foydalanuvchilar').forEach(function (u) {
    if (u.tg_id === tgId && u.faol) user = u;
  });
  var ctx = { tgId: tgId, tgUser: tgUser, user: user, role: user ? user.rol : null, client: null };
  if (user && user.rol === ROLES.CLIENT) {
    ctx.client = clientByTg_(tgId);
  }
  return ctx;
}

function clientByTg_(tgId) {
  var rows = all_('Mijozlar');
  for (var i = 0; i < rows.length; i++) if (rows[i].tg_id === tgId && rows[i].faol) return rows[i];
  return null;
}

/** Bir foydalanuvchi uchun daqiqasiga so'rovlar soni cheklanadi (11.2). */
function rateLimit_(tgId) {
  var limit = settingNum_('rate_limit_daqiqa') || 60;
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + tgId + '_' + Math.floor(now_().getTime() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  if (n > limit) fail('Juda ko\'p so\'rov. Bir daqiqadan keyin urinib ko\'ring', 'limit');
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
