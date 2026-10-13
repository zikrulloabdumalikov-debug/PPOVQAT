/* Ilovani ishga tushirish: Telegram orqali kirish, rolga qarab ekran ochiladi. */
(function () {
  'use strict';
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { try { tg.ready(); tg.expand(); } catch (e) { /* Telegramdan tashqarida */ } }
  UI.applyTheme();

  function notInTelegram() {
    document.getElementById('main').innerHTML =
      '<div class="empty"><div class="empty-ico">🥗</div><h2>Sog\'lom Ovqatlar</h2>' +
      '<p>Ilova Telegram ichida ochiladi. Botimizni oching va "Ilova" tugmasini bosing.</p></div>';
  }

  function boot() {
    if (!UI.initData()) {
      if (UI.cfg.DEV && window.DevLogin) return window.DevLogin.show(boot);
      return notInTelegram();
    }
    UI.loadingView();
    UI.api('me').then(function (me) {
      document.body.setAttribute('data-role', me.rol || 'yangi');
      if (!me.rol || me.rol === 'mijoz') return ClientApp.start(me);
      if (me.rol === 'kuryer') return CourierApp.start(me);
      return AdminApp.start(me);
    }).catch(function (e) {
      UI.errorView(e, function () { location.reload(); });
    });
  }

  boot();
})();
