/* Sog'lom Ovqatlar — umumiy yadro: API, router, UI yordamchilari. */
(function () {
  'use strict';

  var cfg = window.APP_CONFIG || {};
  var tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp : null;

  // ---------- Formatlash ----------
  var MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  var MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  var WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  var WD_LONG = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    var v = Math.round(Number(n) || 0);
    return (v < 0 ? '−' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function som(n) { return money(n) + ' so\'m'; }
  function pd(s) { var p = String(s || '').split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function date(s, withWd) {
    if (!s) return '—';
    var d = pd(String(s).slice(0, 10));
    if (isNaN(d)) return esc(s);
    return d.getUTCDate() + '-' + MONTHS[d.getUTCMonth()] + (withWd ? ', ' + WD_LONG[d.getUTCDay()] : '');
  }
  function dateShort(s) {
    var d = pd(s);
    return d.getUTCDate() + ' ' + MONTHS_SHORT[d.getUTCMonth()];
  }
  function wd(s) { return WD[pd(s).getUTCDay()]; }
  function dt(iso) {
    if (!iso) return '—';
    return date(iso.slice(0, 10)) + ' ' + String(iso).slice(11, 16);
  }
  function addDays(s, n) {
    var d = pd(s); d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function todayTashkent() {
    return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
  }
  function pct(x) { return x === null || x === undefined ? '—' : (Math.round(x * 100) / 100) + '%'; }

  // ---------- Telegram ----------
  function initData() {
    if (tg) return tg.initData;
    if (cfg.DEV) return sessionStorage.getItem('dev_init_data') || '';
    return '';
  }
  function haptic(type) {
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type || 'success'); } catch (e) { /* yo'q */ }
  }
  function applyTheme() {
    var root = document.documentElement;
    if (tg) {
      var p = tg.themeParams || {};
      if (tg.colorScheme === 'dark') root.setAttribute('data-theme', 'dark');
      else root.setAttribute('data-theme', 'light');
      if (p.bg_color) root.style.setProperty('--tg-bg', p.bg_color);
      if (p.secondary_bg_color) root.style.setProperty('--tg-bg2', p.secondary_bg_color);
      if (p.text_color) root.style.setProperty('--tg-text', p.text_color);
      if (p.hint_color) root.style.setProperty('--tg-hint', p.hint_color);
    }
  }

  // ---------- API ----------
  function ApiError(msg, code, data) { this.message = msg; this.code = code; this.data = data; }
  ApiError.prototype = Object.create(Error.prototype);

  var busy = 0;
  function setBusy(d) {
    busy = Math.max(0, busy + d);
    var el = document.getElementById('busy');
    if (el) el.hidden = busy === 0;
  }

  function api(action, payload, opts) {
    var o = opts || {};
    if (!o.silent) setBusy(1);
    return fetch(cfg.API_URL, {
      method: 'POST',
      // text/plain — Apps Script uchun CORS preflight kerak bo'lmaydi
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, initData: initData(), payload: payload || {} }),
      redirect: 'follow'
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res.ok) throw new ApiError(res.error || 'Xato', res.code, res.data);
      return res.data;
    }, function (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('Internet aloqasini tekshiring', 'tarmoq');
    }).finally(function () { if (!o.silent) setBusy(-1); });
  }

  // ---------- UI ----------
  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, kind === 'err' ? 4500 : 2500);
    if (kind === 'err') haptic('error');
  }
  function errToast(e) { toast(e && e.message ? e.message : 'Xato', 'err'); }

  /**
   * HTML ni joylab, data-* atributlari orqali hodisalarni bog'laydi:
   *   data-click="nom", data-change="nom", data-input="nom", data-submit="nom" (form)
   * actions[nom](element, event)
   */
  function mount(root, html, actions) {
    root.innerHTML = html;
    bindActions(root, actions || {});
    return root;
  }
  function bindActions(root, actions) {
    ['click', 'change', 'input', 'submit'].forEach(function (ev) {
      root.querySelectorAll('[data-' + ev + ']').forEach(function (el) {
        var name = el.getAttribute('data-' + ev);
        var fn = actions[name];
        if (!fn) return;
        el.addEventListener(ev, function (e) {
          if (ev === 'submit' || (ev === 'click' && el.tagName === 'A' && el.getAttribute('href') === '#')) e.preventDefault();
          var r = fn(el, e);
          if (r && typeof r.catch === 'function') r.catch(errToast);
        });
      });
    });
  }

  function main() { return document.getElementById('main'); }

  /**
   * Scroll: yangi sahifaga o'tganda tepaga; reload() da avvalgi joyiga;
   * shu sahifaning o'zi qayta chizilganda (tugma bosilganda) joyida qoladi.
   */
  var pendingScroll = null;
  function view(html, actions) {
    var m = main();
    var y = window.scrollY;
    mount(m, html, actions);
    window.scrollTo(0, pendingScroll === null ? y : pendingScroll);
    pendingScroll = null;
    return m;
  }

  /** Joriy sahifani qayta yuklaydi, scroll joyi saqlanadi. */
  function reload() {
    pendingScroll = window.scrollY;
    dispatch();
  }

  function loadingView() {
    main().innerHTML = '<div class="center muted pad"><div class="spinner"></div></div>';
  }

  function errorView(e, retry) {
    view('<div class="empty"><div class="empty-ico">⚠️</div><p>' + esc(e.message || e) + '</p>' +
      (retry ? '<button class="btn" data-click="retry">Qayta urinish</button>' : '') + '</div>', { retry: retry });
  }

  /** Pastdan chiquvchi oyna. Qaytaradi: { el, close } */
  function sheet(title, html, actions, opts) {
    var o = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-bg"></div><div class="sheet ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="sheet-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-click="__close" aria-label="Yopish">✕</button></div>' +
      '<div class="sheet-body"></div></div>';
    document.body.appendChild(wrap);
    document.body.classList.add('noscroll');
    var close = function () {
      wrap.classList.remove('open');
      setTimeout(function () { wrap.remove(); if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('noscroll'); }, 200);
      if (o.onClose) o.onClose();
    };
    var acts = Object.assign({ __close: close }, actions || {});
    wrap.querySelector('.sheet-bg').addEventListener('click', close);
    mount(wrap.querySelector('.sheet-body'), html, acts);
    bindActions(wrap.querySelector('.sheet-head'), acts);
    setTimeout(function () { wrap.classList.add('open'); }, 10);
    return { el: wrap.querySelector('.sheet-body'), close: close, rebind: function (html2) { mount(wrap.querySelector('.sheet-body'), html2, acts); } };
  }

  function confirmBox(text, okLabel, danger) {
    return new Promise(function (resolve) {
      var done = false;
      var s = sheet('Tasdiqlang', '<p class="mb">' + esc(text) + '</p><div class="row gap">' +
        '<button class="btn ghost grow" data-click="no">Yo\'q</button>' +
        '<button class="btn grow ' + (danger ? 'danger' : '') + '" data-click="yes">' + esc(okLabel || 'Ha') + '</button></div>', {
        yes: function () { done = true; s.close(); resolve(true); },
        no: function () { s.close(); }
      }, { onClose: function () { if (!done) resolve(false); } });
    });
  }

  function formData(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else if (el.type !== 'file') out[el.name] = el.value.trim();
    });
    return out;
  }

  /** Rasmni kichraytirib JPEG data URL qiladi (chek uchun: 1280 px, ~200 KB). */
  function compressImage(file, maxSide) {
    var max = maxSide || 1280;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Rasm tanlang'));
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = function () { reject(new Error('Rasmni o\'qib bo\'lmadi')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('Faylni o\'qib bo\'lmadi')); };
      reader.readAsDataURL(file);
    });
  }

  function copyText(text) {
    var done = function () { toast('Nusxalandi'); haptic('success'); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(text); }
      t.remove();
    }
  }

  function openLink(url) {
    if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener');
  }

  // ---------- Router ----------
  var routes = [];
  var navItems = [];
  var current = '';

  function route(pattern, fn) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:([a-z_]+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re: re, keys: keys, fn: fn, pattern: pattern });
  }

  function parseHash() {
    var h = (location.hash || '#/').slice(1);
    var q = {};
    var i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      h = h.slice(0, i);
    }
    return { path: h.replace(/^\/+|\/+$/g, ''), query: q };
  }

  function go(path) {
    var target = '#/' + String(path || '').replace(/^#?\/?/, '');
    if (location.hash === target) dispatch(); else location.hash = target;
  }

  function dispatch() {
    if (pendingScroll === null) pendingScroll = 0;
    var h = parseHash();
    current = h.path;
    for (var i = 0; i < routes.length; i++) {
      var m = h.path.match(routes[i].re);
      if (m) {
        var params = {};
        routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        highlightNav(h.path);
        updateBackButton(h.path);
        loadingView();
        var r;
        try { r = routes[i].fn(params, h.query); } catch (e) { errorView(e, dispatch); return; }
        if (r && typeof r.catch === 'function') r.catch(function (e) { errorView(e, dispatch); });
        return;
      }
    }
    go('');
  }

  function updateBackButton(path) {
    if (!tg || !tg.BackButton) return;
    if (path) tg.BackButton.show(); else tg.BackButton.hide();
  }

  function highlightNav(path) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var p = a.getAttribute('data-nav');
      var active = p === '' ? path === '' : (path === p || path.indexOf(p + '/') === 0);
      a.classList.toggle('active', active);
    });
  }

  /** Navigatsiya: items = [{ path, icon, label, more: bool }] */
  function setNav(items, title) {
    navItems = items;
    var main = items.filter(function (x) { return !x.more; });
    var more = items.filter(function (x) { return x.more; });
    var bottom = main.slice(0, more.length ? 4 : 5);
    var overflow = main.slice(bottom.length).concat(more);
    var link = function (x) {
      return '<a href="#/' + x.path + '" data-nav="' + x.path + '"><span class="nav-ico">' + x.icon + '</span><span>' + esc(x.label) + '</span></a>';
    };
    document.getElementById('sidenav').innerHTML = '<div class="brand">🥗 ' + esc(title || "Sog'lom Ovqatlar") + '</div>' + items.map(link).join('');
    document.getElementById('bottomnav').innerHTML = bottom.map(link).join('') +
      (overflow.length ? '<a href="#/menu" data-nav="menu"><span class="nav-ico">☰</span><span>Ko\'proq</span></a>' : '');
    if (overflow.length) {
      route('menu', function () {
        view('<h1>Bo\'limlar</h1><div class="list">' + overflow.map(function (x) {
          return '<a class="list-item link" href="#/' + x.path + '"><span class="li-ico">' + x.icon + '</span><span class="grow">' + esc(x.label) + '</span><span class="muted">›</span></a>';
        }).join('') + '</div>');
      });
    }
    document.body.classList.add('has-nav');
  }

  function start() {
    window.addEventListener('hashchange', dispatch);
    if (tg && tg.BackButton) tg.BackButton.onClick(function () { history.length > 1 ? history.back() : go(''); });
    dispatch();
  }

  // ---------- Umumiy komponentlar ----------
  function statusBadge(code, label) {
    return '<span class="badge st-' + esc(code) + '">' + esc(label || code) + '</span>';
  }

  function empty(icon, text, btn) {
    return '<div class="empty"><div class="empty-ico">' + icon + '</div><p>' + esc(text) + '</p>' + (btn || '') + '</div>';
  }

  function progress(p) {
    var v = Math.max(0, Math.min(100, Number(p) || 0));
    return '<div class="progress"><div style="width:' + v + '%"></div></div>';
  }

  function field(label, input, hint) {
    return '<label class="field"><span class="field-label">' + esc(label) + '</span>' + input +
      (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function options(list, selected, opts) {
    var o = opts || {};
    return (o.empty !== undefined ? '<option value="">' + esc(o.empty) + '</option>' : '') + list.map(function (x) {
      var v = typeof x === 'object' ? x.value : x;
      var l = typeof x === 'object' ? x.label : x;
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }

  function calendar(days, opts) {
    // days: [{sana, holat, holat_nomi, ...}]; opts.action — data-click nomi
    var o = opts || {};
    return '<div class="cal">' + days.map(function (d) {
      var clickable = o.clickable && o.clickable(d);
      return '<button class="cal-day st-' + esc(d.holat) + (clickable ? ' can' : '') + '" ' +
        (clickable ? 'data-click="' + o.action + '" data-id="' + esc(d.id) + '"' : 'disabled') +
        ' title="' + esc(d.holat_nomi + (d.sabab ? ': ' + d.sabab : '')) + '">' +
        '<span class="cal-wd">' + wd(d.sana) + '</span><span class="cal-d">' + dateShort(d.sana) + '</span></button>';
    }).join('') + '</div>' +
      '<div class="legend"><span class="lg st-rejada">Rejada</span><span class="lg st-yetkazildi">Yetkazildi</span>' +
      '<span class="lg st-pauza">Pauza</span><span class="lg st-yetkazilmadi">Yetkazilmadi</span></div>';
  }

  window.UI = {
    cfg: cfg, tg: tg, esc: esc, money: money, som: som, date: date, dateShort: dateShort, dt: dt, wd: wd, pct: pct,
    addDays: addDays, today: todayTashkent, api: api, ApiError: ApiError, toast: toast, errToast: errToast, haptic: haptic,
    mount: mount, bindActions: bindActions, view: view, loadingView: loadingView, errorView: errorView, sheet: sheet,
    confirm: confirmBox, formData: formData, compressImage: compressImage, copyText: copyText, openLink: openLink,
    route: route, go: go, start: start, setNav: setNav, parseHash: parseHash, reload: reload,
    statusBadge: statusBadge, empty: empty, progress: progress, field: field, options: options, calendar: calendar,
    applyTheme: applyTheme, initData: initData
  };
})();
