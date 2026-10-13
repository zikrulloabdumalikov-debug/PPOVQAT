/**
 * Telegram bot: xabarlar (6.3, 8.3), webhook (kontakt, joylashuv, chek rasmi) va Drive'dagi rasmlar.
 * Xabarlar navbatga qo'yiladi va so'rov oxirida (qulfdan tashqarida) yuboriladi.
 */

var NOTIFY_QUEUE = [];

function tgApi_(method, payload) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken_() + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false }; }
}

function webAppUrl_() {
  return PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || '';
}

function openAppMarkup_(label) {
  var url = webAppUrl_();
  if (!url) return null;
  return { inline_keyboard: [[{ text: label || '🍽 Ilovani ochish', web_app: { url: url } }]] };
}

/** Xabarni navbatga qo'yadi. */
function queueMessage_(chatId, text, markup) {
  if (!chatId) return;
  var m = { chat_id: String(chatId), text: String(text).slice(0, 4000), disable_web_page_preview: true };
  if (markup) m.reply_markup = markup;
  NOTIFY_QUEUE.push(m);
}

/** Navbatdagi xabarlarni birdaniga yuboradi; xato asosiy amalni buzmaydi. */
function flushNotifications_() {
  if (!NOTIFY_QUEUE.length) return 0;
  var q = NOTIFY_QUEUE;
  NOTIFY_QUEUE = [];
  var token;
  try { token = botToken_(); } catch (e) { return 0; }
  var reqs = q.map(function (m) {
    return {
      url: 'https://api.telegram.org/bot' + token + '/sendMessage',
      method: 'post', contentType: 'application/json', payload: JSON.stringify(m), muteHttpExceptions: true
    };
  });
  for (var i = 0; i < reqs.length; i += 50) {
    try { UrlFetchApp.fetchAll(reqs.slice(i, i + 50)); } catch (e) { console.error('Telegram xabar xatosi: ' + e); }
  }
  return reqs.length;
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

// ---------- Rasmlar (yopiq Drive papkasi, 11.1) ----------

function privateFolder_(settingKey, name) {
  var id = setting_(settingKey);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* qayta yaratiladi */ }
  }
  var f = DriveApp.createFolder(name);
  saveSettings_((function () { var o = {}; o[settingKey] = f.getId(); return o; })(), 'tizim');
  return f;
}

var IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** data:image/...;base64,... → Drive fayl id. Faqat rasm, 5 MB gacha. */
function saveImage_(dataUrl, name) {
  var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) fail('Rasm formati noto\'g\'ri (JPG, PNG yoki WEBP)');
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > IMAGE_MAX_BYTES) fail('Rasm juda katta (5 MB gacha)');
  var ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
  var blob = Utilities.newBlob(bytes, m[1], name + '_' + today_() + '.' + ext);
  var file = privateFolder_('chek_papka_id', "Sog'lom Ovqatlar — cheklar (yopiq)").createFile(blob);
  return file.getId();
}

function readImage_(fileId) {
  var blob = DriveApp.getFileById(fileId).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

// ---------- Webhook ----------

/** Telegram yangilanishi (bot chatidagi xabarlar). Takror kelgan update_id e'tiborsiz qoldiriladi. */
function handleTelegramUpdate_(update) {
  var cache = CacheService.getScriptCache();
  var key = 'upd_' + update.update_id;
  if (cache.get(key)) return;
  cache.put(key, '1', 21600);
  var msg = update.message;
  if (!msg || !msg.from || !msg.chat || msg.chat.type !== 'private') return;
  var tgId = String(msg.from.id);
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
    handleReceiptPhoto_(tgId, msg.photo[msg.photo.length - 1].file_id);
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
function handleReceiptPhoto_(tgId, fileId) {
  withLock_(function () {
    var client = clientByTg_(tgId);
    if (!client) { queueMessage_(tgId, 'Avval ilovada ro\'yxatdan o\'ting.', openAppMarkup_()); return; }
    var order = clientOrders_(client.id).filter(function (o) { return o.holat === 'tolov_kutish'; })[0];
    if (!order) { queueMessage_(tgId, 'To\'lov kutayotgan buyurtma topilmadi.'); return; }
    var info = tgApi_('getFile', { file_id: fileId });
    if (!info.ok) { queueMessage_(tgId, 'Rasmni olib bo\'lmadi, ilova orqali yuboring.'); return; }
    var blob = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + botToken_() + '/' + info.result.file_path).getBlob();
    var dataUrl = 'data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes());
    var ctx = { tgId: tgId, user: { id: 'mijoz', ism: client.ism }, role: ROLES.CLIENT, client: client };
    try {
      submitPayment_(ctx, order, { usul: 'karta', chek: dataUrl, izoh: 'Bot orqali' });
      queueMessage_(tgId, '🧾 Chek qabul qilindi. Admin tasdiqlagach xabar beramiz.');
    } catch (e) {
      queueMessage_(tgId, '❗️ ' + e.message);
    }
  });
}
