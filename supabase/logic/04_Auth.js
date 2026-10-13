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
