/* Manzil formasi: xaritada nuqta (Leaflet + OpenStreetMap), matn, mo'ljal, hudud (8.1). */
(function () {
  'use strict';
  var esc = UI.esc;
  var TASHKENT = [41.3111, 69.2797];

  function initMap(el, lat, lng, onMove) {
    if (!window.L) {
      el.innerHTML = '<div class="muted pad">Xarita yuklanmadi. Manzilni matn bilan yozing.</div>';
      return null;
    }
    var has = lat !== '' && lat !== null && lat !== undefined && lng !== '' && lng !== null;
    var map = L.map(el, { zoomControl: true, attributionControl: true }).setView(has ? [lat, lng] : TASHKENT, has ? 16 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap'
    }).addTo(map);
    var marker = null;
    var place = function (ll, pan) {
      if (!marker) {
        marker = L.marker(ll, { draggable: true }).addTo(map);
        marker.on('dragend', function () { var p = marker.getLatLng(); onMove(p.lat, p.lng); });
      } else marker.setLatLng(ll);
      if (pan) map.setView(ll, Math.max(map.getZoom(), 16));
      onMove(ll[0] !== undefined ? ll[0] : ll.lat, ll[1] !== undefined ? ll[1] : ll.lng);
    };
    if (has) place([lat, lng], false);
    map.on('click', function (e) { place([e.latlng.lat, e.latlng.lng], false); });
    setTimeout(function () { map.invalidateSize(); }, 250);
    return { map: map, place: place };
  }

  /**
   * Manzil formasini konteynerga joylaydi.
   * opts: { addr, hududlar, submitLabel, onSubmit(data) → Promise, telegramLocation: bool }
   */
  function form(container, opts) {
    var a = opts.addr || {};
    var coords = { lat: a.lat === undefined ? '' : a.lat, lng: a.lng === undefined ? '' : a.lng };
    var html =
      '<form data-submit="save" class="stack">' +
      '<div class="map" id="mapbox"></div>' +
      '<div class="row gap wrap">' +
      '<button type="button" class="btn small ghost" data-click="geo">📍 Mening joylashuvim</button>' +
      (opts.telegramLocation ? '<button type="button" class="btn small ghost" data-click="tgloc">📨 Telegramdagi joylashuv</button>' : '') +
      '</div>' +
      '<p class="hint" id="coordHint">' + (coords.lat !== '' ? 'Nuqta belgilandi ✓' : 'Xaritada uyingizni bosing yoki nuqtani suring') + '</p>' +
      UI.field('Nomi', '<input name="nom" maxlength="50" placeholder="Uy, ish..." value="' + esc(a.nom || '') + '">') +
      UI.field('Manzil (matn)', '<textarea name="matn" rows="2" required maxlength="300" placeholder="Ko\'cha, uy, kvartira">' + esc(a.matn || '') + '</textarea>',
        'Kuryer uchun bu xaritadan muhimroq') +
      UI.field('Mo\'ljal', '<input name="moljal" maxlength="200" placeholder="ko\'k darvoza, 2-qavat" value="' + esc(a.moljal || '') + '">') +
      UI.field('Hudud', '<select name="hudud" required>' + UI.options(opts.hududlar || [], a.hudud, { empty: 'Tanlang' }) + '</select>') +
      '<button class="btn block" type="submit">' + esc(opts.submitLabel || 'Saqlash') + '</button>' +
      '</form>';
    var m;
    var setHint = function () {
      var h = container.querySelector('#coordHint');
      if (h) h.textContent = coords.lat !== '' ? 'Nuqta belgilandi ✓' : 'Xaritada uyingizni bosing';
    };
    UI.mount(container, html, {
      save: function (formEl) {
        var d = UI.formData(formEl);
        d.lat = coords.lat; d.lng = coords.lng;
        if (a.id) d.id = a.id;
        return opts.onSubmit(d);
      },
      geo: function () {
        if (!navigator.geolocation) return UI.toast('Qurilma joylashuvni bermaydi', 'err');
        navigator.geolocation.getCurrentPosition(function (p) {
          if (m) m.place([p.coords.latitude, p.coords.longitude], true);
        }, function () {
          UI.toast('Joylashuvga ruxsat berilmadi. Telegramdagi "📍 Joylashuvni yuborish" tugmasidan foydalaning', 'err');
        }, { enableHighAccuracy: true, timeout: 10000 });
      },
      tgloc: function () {
        return UI.api('sharedLocation').then(function (loc) {
          if (!loc) return UI.toast('Avval botga "📍 Joylashuvni yuborish" tugmasi orqali joylashuv yuboring', 'err');
          if (m) m.place([loc.lat, loc.lng], true);
          UI.toast('Joylashuv olindi');
        });
      }
    });
    m = initMap(container.querySelector('#mapbox'), coords.lat, coords.lng, function (lat, lng) {
      coords.lat = Math.round(lat * 1e6) / 1e6;
      coords.lng = Math.round(lng * 1e6) / 1e6;
      setHint();
    });
  }

  window.AddrForm = { form: form };
})();
