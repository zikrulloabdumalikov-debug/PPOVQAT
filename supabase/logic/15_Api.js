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
  profileUpdate: { r: R_CLIENT, w: 1, fn: function (ctx, p) { return profileUpdate_(ctx, p); } },
  requestPhoneChange: { r: R_CLIENT, w: 1, fn: function (ctx, p) { return requestPhoneChange_(ctx, p); } },

  // ---- admin panel: sherik va operator (7-bo'lim) ----
  adminToday: { r: R_STAFF, fn: function (ctx) { return adminToday_(ctx); } },
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
