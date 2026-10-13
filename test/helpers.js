'use strict';
const { createGas, signInitData } = require('./gas-mock');

const TOKEN = '123456:TEST-BOT-TOKEN';
const IDS = { partner: '1000001', partner2: '1000002', operator: '2000001', courier: '3000001', clientA: '5000001', clientB: '5000002' };

/**
 * To'liq sinov muhiti: varaqlar, misol narxlar (TZ 5.1), 2 sherik, operator, kuryer va 2 mijoz.
 * Boshlang'ich vaqt: 2026-10-13 (seshanba) 10:00 Toshkent.
 */
function makeEnv(opts = {}) {
  const gas = createGas({
    props: { BOT_TOKEN: TOKEN, ADMIN_TG_IDS: IDS.partner + ',' + IDS.partner2, WEBAPP_URL: 'https://example.test/app/' },
    now: opts.now
  });
  gas.setTashkent(opts.date || '2026-10-13', opts.time || '10:00');
  gas.call('setup');
  gas.call('seedExample');

  const api = (tgId, action, payload, extra) => {
    const nowSec = Math.floor(gas.ctx.__NOW__ / 1000);
    const initData = (extra && extra.initData) || signInitData(TOKEN, { id: Number(tgId), first_name: 'T' + tgId }, nowSec);
    // HTTP orqali kelgandek: JSON ga aylantirib qaytaramiz
    return JSON.parse(JSON.stringify(gas.call('handleApi_', { action, initData, payload: payload || {} })));
  };
  const ok = (tgId, action, payload) => {
    const r = api(tgId, action, payload);
    if (!r.ok) throw new Error(action + ': ' + r.error + ' [' + r.code + ']');
    return r.data;
  };
  // telegram webhook orqali kontakt ulashish
  const shareContact = (tgId, phone) => {
    gas.call('dbReset_');
    gas.call('handleTelegramUpdate_', {
      update_id: Math.floor(Math.random() * 1e9),
      message: { from: { id: Number(tgId) }, chat: { id: Number(tgId), type: 'private' }, contact: { phone_number: phone, user_id: Number(tgId) } }
    });
  };
  const register = (tgId, phone, ism, hudud) => {
    shareContact(tgId, phone);
    return ok(tgId, 'register', {
      ism, manba: 'Instagram', rozilik: true,
      manzil: { nom: 'Uy', lat: 41.31, lng: 69.28, matn: 'Chilonzor 9-kvartal, 12-uy', moljal: 'ko\'k darvoza', hudud: hudud || 'Chilonzor' }
    });
  };

  const partnerUser = gas.rows('Foydalanuvchilar').find((u) => u.tg_id === IDS.partner);
  ok(IDS.partner, 'userSave', { tg_id: IDS.operator, rol: 'operator', ism: 'Operator' });
  ok(IDS.partner, 'userSave', { tg_id: IDS.courier, rol: 'kuryer', ism: 'Kuryer Ali' });
  ok(IDS.partner, 'settingsSave', { qiymatlar: { karta_raqami: '8600 1234 5678 9012', karta_egasi: 'Sherik 1', kuryer_guruh_chat_id: '-100555' } });
  if (opts.clients !== false) {
    register(IDS.clientA, '+998901112233', 'Aziza');
    register(IDS.clientB, '+998907778899', 'Bobur', 'Yunusobod');
  }
  const pricing = ok(IDS.partner, 'pricing');
  const ration = pricing.ratsionlar[0];
  const pkg = (days) => pricing.paketlar_joriy.find((p) => p.kunlar === days);

  return { gas, api, ok, register, shareContact, IDS, TOKEN, partnerUser, ration, pkg, pricing };
}

/** Mijoz buyurtma beradi, chek yuboradi, admin tasdiqlaydi. Qaytaradi: buyurtma ko'rinishi. */
function placePaidOrder(env, tgId, days, opts = {}) {
  const form = env.ok(tgId, 'orderForm');
  const order = env.ok(tgId, 'createOrder', {
    ratsion_id: env.ration.id, paket_id: env.pkg(days).id, boshlanish: opts.boshlanish || form.eng_erta,
    manzil_id: form.manzillar[0].id, use_cashback: !!opts.use_cashback
  });
  if (order.holat !== 'tolov_kutish') return order;
  env.ok(tgId, 'submitPayment', { buyurtma_id: order.id, usul: 'karta', chek: PNG });
  const pay = env.gas.rows('Tolovlar').filter((p) => p.buyurtma_id === order.id && p.holat === 'kutilmoqda')[0];
  const res = env.ok(env.IDS.operator, 'paymentConfirm', { tolov_id: pay.id });
  return Object.assign(res.buyurtma, { tolov_id: pay.id });
}

// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

module.exports = { makeEnv, placePaidOrder, PNG, TOKEN, IDS };
