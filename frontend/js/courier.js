/* Kuryer ekrani (TZ 8.3): bugun kimga, qayerga, nima — hudud bo'yicha guruhlangan. */
(function () {
  'use strict';
  var esc = UI.esc, api = UI.api;

  function card(c) {
    var done = c.holat !== 'rejada';
    return '<div class="dcard ' + (done ? 'done st-' + esc(c.holat) : '') + '" id="c_' + esc(c.id) + '">' +
      '<div class="row between"><b class="dname">' + esc(c.ism) + '</b>' + (done ? UI.statusBadge(c.holat, c.holat_nomi) : (c.yoldaman ? '<span class="badge">🚗 yo\'lda</span>' : '')) + '</div>' +
      '<a class="phone" href="tel:' + esc(c.telefon) + '">📞 ' + esc(c.telefon) + '</a>' +
      '<div class="addr">📍 ' + esc(c.manzil) + '</div>' +
      (c.moljal ? '<div class="small">🧭 ' + esc(c.moljal) + '</div>' : '') +
      '<div class="small">🍱 <b>' + esc(c.ratsion) + '</b></div>' +
      (c.izoh ? '<div class="small muted">💬 ' + esc(c.izoh) + '</div>' : '') +
      (c.sabab ? '<div class="small neg">' + esc(c.sabab) + '</div>' : '') +
      (done ? '' : '<div class="dbtns">' +
        (c.lat !== '' ? '<button class="btn small ghost" data-click="map" data-id="' + esc(c.id) + '">🗺 Xaritada</button>' : '') +
        (c.yoldaman ? '' : '<button class="btn small ghost" data-click="way" data-id="' + esc(c.id) + '">🚗 Yo\'ldaman</button>') +
        '<button class="btn small ok-btn" data-click="done" data-id="' + esc(c.id) + '">✅ Yetkazildi</button>' +
        '<button class="btn small danger" data-click="fail" data-id="' + esc(c.id) + '">✖ Bo\'lmadi</button></div>') +
      '</div>';
  }

  function today() {
    return api('courierToday').then(function (d) {
      var byId = {};
      d.guruhlar.forEach(function (g) { g.items.forEach(function (c) { byId[c.id] = c; }); });
      var html = '<div class="courier-head"><div><div class="muted small">' + UI.date(d.sana, true) + '</div><h1>Yetkazishlar</h1></div>' +
        '<div class="kpi-mini"><b>' + d.qoldi + '</b><span>/ ' + d.jami + ' qoldi</span></div></div>' + UI.progress(d.jami ? (d.jami - d.qoldi) / d.jami * 100 : 0);
      if (!d.jami) html += UI.empty('🛵', 'Bugun sizga biriktirilgan yetkazish yo\'q');
      d.guruhlar.forEach(function (g) {
        html += '<h3 class="sec">📍 ' + esc(g.hudud) + ' <span class="muted">(' + g.qoldi + '/' + g.soni + ')</span></h3>' + g.items.map(card).join('');
      });
      html += '<button class="btn ghost block mt" data-click="refresh">↻ Yangilash</button>';
      UI.view(html, {
        refresh: function () { UI.reload(); },
        map: function (el) {
          var c = byId[el.dataset.id];
          var s = UI.sheet('Xaritada ochish', '<div class="stack"><button class="btn block" data-click="y">Yandex Maps</button>' +
            '<button class="btn block ghost" data-click="g">Google Maps</button></div>', {
            y: function () { UI.openLink(c.yandex); s.close(); },
            g: function () { UI.openLink(c.google); s.close(); }
          });
        },
        way: function (el) {
          return api('courierOnTheWay', { id: el.dataset.id }).then(function () { UI.toast('Mijozga xabar yuborildi'); UI.reload(); });
        },
        done: function (el) {
          el.disabled = true;
          return api('courierDelivered', { id: el.dataset.id }).then(function () { UI.haptic('success'); UI.reload(); })
            .finally(function () { el.disabled = false; });
        },
        fail: function (el) {
          var id = el.dataset.id;
          var s = UI.sheet('Sababni tanlang', '<form data-submit="send" class="stack">' + d.sabablar.map(function (r, i) {
            return '<label class="list-item"><input type="radio" name="sabab" value="' + esc(r.kod) + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(r.nom) + '</label>';
          }).join('') + UI.field('Izoh', '<input name="izoh" maxlength="300">') + '<button class="btn danger block">Belgilash</button></form>', {
            send: function (form) {
              var f = UI.formData(form);
              return api('courierFailed', { id: id, sabab: f.sabab, izoh: f.izoh }).then(function () { s.close(); UI.reload(); });
            }
          });
        }
      });
    });
  }

  function start() {
    document.body.classList.remove('has-nav');
    UI.route('', today);
    UI.start();
  }

  window.CourierApp = { start: start, card: card };
})();
