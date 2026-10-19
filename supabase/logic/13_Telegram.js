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
