/* Faqat lokal dev: Telegramsiz foydalanuvchi tanlash va bot hodisalarini taqlid qilish. */
(function () {
  'use strict';
  function pick(cb) {
    fetch('/dev/users').then(function (r) { return r.json(); }).then(function (users) {
      var main = document.getElementById('main');
      main.innerHTML = '<h1>🧪 Dev: kim bo\'lib kirasiz?</h1><p class="muted">Telegram initData shu server tokeni bilan imzolanadi.</p><div class="dev-users">' +
        users.map(function (u) {
          return '<button class="btn block ghost" data-tg="' + u.tg_id + '">' + u.ism + ' <span class="small muted">' + u.rol + ' · ' + u.tg_id + '</span></button>';
        }).join('') + '</div>';
      main.querySelectorAll('[data-tg]').forEach(function (b) {
        b.addEventListener('click', function () { login(b.getAttribute('data-tg'), cb); });
      });
    });
  }
  function login(tg, cb) {
    fetch('/dev/sign?tg=' + tg).then(function (r) { return r.json(); }).then(function (d) {
      sessionStorage.setItem('dev_init_data', d.initData);
      sessionStorage.setItem('dev_tg', tg);
      if (cb) cb(); else location.reload();
    });
  }
  function panel() {
    var tg = sessionStorage.getItem('dev_tg');
    if (!tg) return;
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:8px;bottom:72px;z-index:400;display:flex;gap:4px;opacity:.85';
    el.innerHTML = '<button class="btn small ghost" style="background:var(--card)" id="devSwitch">🧪 ' + tg + '</button>' +
      '<button class="btn small ghost" style="background:var(--card)" id="devContact" title="Botga kontakt yuborish">📱</button>' +
      '<button class="btn small ghost" style="background:var(--card)" id="devSent" title="Bot xabarlari">💬</button>';
    document.body.appendChild(el);
    el.querySelector('#devSwitch').onclick = function () { sessionStorage.clear(); location.hash = ''; location.reload(); };
    el.querySelector('#devContact').onclick = function () {
      var phone = prompt('Telefon (Telegram kontakt sifatida botga yuboriladi)', '+99893' + String(Math.floor(1000000 + Math.random() * 8999999)));
      if (phone) fetch('/dev/contact?tg=' + tg + '&phone=' + encodeURIComponent(phone)).then(function () { UI.toast('Kontakt yuborildi'); });
    };
    el.querySelector('#devSent').onclick = function () {
      fetch('/dev/sent').then(function (r) { return r.json(); }).then(function (list) {
        UI.sheet('Bot xabarlari (oxirgi 50)', '<div class="list">' + list.reverse().map(function (m) {
          return '<div class="list-item"><div><div class="small muted">→ ' + UI.esc(m.chat_id) + '</div><div style="white-space:pre-line">' + UI.esc(m.text) + '</div></div></div>';
        }).join('') + '</div>', {}, { wide: true });
      });
    };
  }
  window.DevLogin = { show: pick };
  document.addEventListener('DOMContentLoaded', panel);
  if (document.readyState !== 'loading') setTimeout(panel, 0);
})();
