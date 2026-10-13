'use strict';
/**
 * Lokal dev server: backend/*.gs kodini xotiradagi Google Sheets nusxasida ishga tushiradi
 * va frontend/ ni beradi. Telegramsiz sinash uchun foydalanuvchini tanlash paneli bor.
 *
 *   npm run dev   →   http://localhost:8080
 *
 * Bu faqat ishlab chiqish uchun: imzo baribir tekshiriladi (dev tokeni bilan).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGas, signInitData } = require('../test/gas-mock');

const PORT = Number(process.env.PORT || 8080);
const TOKEN = 'dev:DEV-BOT-TOKEN';
const FRONT = path.join(__dirname, '..', 'frontend');
const USERS = [
  { tg_id: 111111, ism: 'Sherik Zikrulloh', rol: 'sherik' },
  { tg_id: 111112, ism: 'Sherik 2', rol: 'sherik' },
  { tg_id: 222222, ism: 'Operator Dilnoza', rol: 'operator' },
  { tg_id: 333333, ism: 'Kuryer Ali', rol: 'kuryer' },
  { tg_id: 444444, ism: 'Aziza (mijoz)', rol: 'mijoz' },
  { tg_id: 900000003, ism: 'Test mijoz 4', rol: 'mijoz' },
  { tg_id: 555000 + Math.floor(Math.random() * 999), ism: 'Yangi foydalanuvchi', rol: 'yangi' }
];

const gas = createGas({ realTime: true, props: { BOT_TOKEN: TOKEN, ADMIN_TG_IDS: '111111,111112', WEBAPP_URL: 'http://localhost:' + PORT + '/', ALLOW_TEST_SEED: 'ha' } });
const call = (fn, ...a) => gas.call(fn, ...a);
const sign = (u) => signInitData(TOKEN, { id: u.tg_id, first_name: u.ism.split(' ')[0] }, Math.floor(Date.now() / 1000));
const api = (tg, action, payload) => {
  const r = call('handleApi_', { action, initData: sign({ tg_id: tg, ism: 'x' }), payload });
  if (!r.ok) throw new Error(action + ': ' + r.error);
  return r.data;
};

function seed() {
  call('setup');
  call('seedTestData'); // 100 mijoz, 300 buyurtma — dashboard va tezlik uchun
  api(111111, 'settingsSave', {
    qiymatlar: {
      karta_raqami: '8600 1234 5678 9012', karta_egasi: 'Sherik Zikrulloh', aloqa_telefon: '+998901234567',
      kuryer_guruh_chat_id: '-100123', ishga_tushish_sana: call('addDays_', call('today_'), -40),
      sherik_ulushlari: JSON.stringify([{ ism: 'Sherik 1', foiz: 25 }, { ism: 'Sherik 2', foiz: 35 }, { ism: 'Sherik 3', foiz: 40 }])
    }
  });
  api(111111, 'userSave', { tg_id: '222222', rol: 'operator', ism: 'Operator Dilnoza' });
  api(111111, 'userSave', { tg_id: '333333', rol: 'kuryer', ism: 'Kuryer Ali' });
  // barcha hududlar shu kuryerga
  const hududlar = JSON.parse(call('setting_', 'hududlar'));
  const kid = gas.rows('Foydalanuvchilar').find((u) => u.tg_id === '333333').id;
  hududlar.forEach((h) => api(111111, 'assignCourier', { hudud: h, sana: call('today_'), kuryer_id: kid, eslab_qol: true }));
  // demo mijoz
  call('dbReset_');
  call('handleTelegramUpdate_', { update_id: 1, message: { from: { id: 444444 }, chat: { id: 444444, type: 'private' }, contact: { phone_number: '+998901112233', user_id: 444444 } } });
  api(444444, 'register', {
    ism: 'Aziza', manba: 'Instagram', rozilik: true,
    manzil: { nom: 'Uy', lat: 41.2856, lng: 69.2034, matn: 'Chilonzor 9-kvartal, 12-uy, 34-xonadon', moljal: 'ko\'k darvoza, 2-qavat', hudud: 'Chilonzor' }
  });
  const ration = gas.rows('Ratsionlar')[0];
  const t = call('today_');
  for (let i = 0; i < 7; i++) {
    api(111111, 'menuSave', { sana: call('addDays_', t, i), ratsion_id: ration.id, kaloriya: 1200 + (i % 3) * 50,
      taomlar: 'Nonushta: suli bo\'tqasi, yong\'oq\nTushlik: tovuq ko\'krak, grechka, salat\nKechki: baliq, sabzavotlar' });
  }
  const turk = gas.rows('XarajatTurkum');
  const cat = (kod) => turk.find((c) => c.kod === kod).id;
  const ym = t.slice(0, 7);
  [['bozorlik', 2800000, -1], ['qadoq', 900000, -2], ['yetkazish', 400000, -1], ['reklama', 1500000, -5]].forEach(([k, s, d]) => {
    api(111111, 'expenseAdd', { turkum_id: cat(k), summa: s, sana: call('addDays_', t, d), izoh: 'demo', manba: k === 'reklama' ? 'Instagram' : '' });
  });
  api(111111, 'expenseAdd', { turkum_id: cat('ijara'), summa: 4000000, sana: ym + '-01', izoh: 'ijara' });
  api(111111, 'expenseAdd', { turkum_id: cat('sherik'), summa: 2000000, sana: call('addDays_', t, -3), sherik_id: 'Sherik 1' });
  api(111111, 'staffSave', { ism: 'Oshpaz Lola', lavozim: 'Oshpaz', oylik_turi: 'qatiy', summa: 4500000 });
  api(111111, 'staffSave', { ism: 'Kuryer Ali', lavozim: 'Kuryer', oylik_turi: 'yetkazish', summa: 12000, tg_id: '333333' });
  // Aziza buyurtma berib, chek yuboradi (tasdiqlash adminda)
  const form = api(444444, 'orderForm', {});
  const pk = form.katalog.ratsionlar[0].paketlar[1];
  const o = api(444444, 'createOrder', { ratsion_id: ration.id, paket_id: pk.paket_id, boshlanish: form.eng_erta, manzil_id: form.manzillar[0].id });
  api(444444, 'submitPayment', { buyurtma_id: o.id, usul: 'karta', chek: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' });
  // seedTestData mijozlari ham kuryerga
  hududlar.forEach((h) => api(111111, 'assignCourier', { hudud: h, sana: t, kuryer_id: kid, eslab_qol: true }));
  gas.clearSent();
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function readBody(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => resolve(b)); });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (obj, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'POST' && url.pathname === '/api') {
      const body = await readBody(req);
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) { return json({ ok: false, error: 'JSON' }); }
      return json(call('handleApi_', parsed));
    }
    if (url.pathname === '/dev/users') return json(USERS);
    if (url.pathname === '/dev/sign') {
      const u = USERS.find((x) => String(x.tg_id) === url.searchParams.get('tg')) || { tg_id: Number(url.searchParams.get('tg')), ism: 'Mehmon' };
      return json({ initData: sign(u) });
    }
    if (url.pathname === '/dev/contact') {
      const tg = Number(url.searchParams.get('tg'));
      call('dbReset_');
      call('handleTelegramUpdate_', { update_id: Date.now(), message: { from: { id: tg }, chat: { id: tg, type: 'private' }, contact: { phone_number: url.searchParams.get('phone') || '+998935550000', user_id: tg } } });
      return json({ ok: true });
    }
    if (url.pathname === '/dev/cron') { call('cronTick'); return json({ ok: true }); }
    if (url.pathname === '/dev/sent') return json(gas.sent.slice(-50).map((m) => m.payload));

    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    if (file === '/config.js') {
      res.writeHead(200, { 'Content-Type': MIME['.js'] });
      return res.end("window.APP_CONFIG = { API_URL: '/api', DEV: true };");
    }
    if (file === '/dev-login.js') {
      res.writeHead(200, { 'Content-Type': MIME['.js'] });
      return res.end(fs.readFileSync(path.join(__dirname, 'dev-login.js')));
    }
    const fp = path.join(FRONT, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
    if (!fp.startsWith(FRONT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('404'); }
    let content = fs.readFileSync(fp);
    if (file === '/index.html') content = Buffer.from(content.toString().replace('<!--DEV-->', '<script src="/dev-login.js"></script>'));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch (e) {
    console.error(e);
    json({ ok: false, error: String(e.message || e) }, 500);
  }
});

seed();
server.listen(PORT, () => {
  console.log('Dev server: http://localhost:' + PORT);
  console.log('Foydalanuvchilar: ' + USERS.map((u) => u.ism + ' (' + u.tg_id + ')').join(', '));
});
