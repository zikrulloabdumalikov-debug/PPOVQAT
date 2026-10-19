/* Admin panel (TZ 7-bo'lim), 1-qism: Bugun, Buyurtmalar, Mijozlar, Menyu, Yetkazish. */
(function () {
  'use strict';
  var esc = UI.esc, som = UI.som, money = UI.money, api = UI.api;
  var A = window.AdminApp = window.AdminApp || {};

  function kpi(label, value, sub, cls, href) {
    var inner = '<div class="kpi-label">' + esc(label) + '</div><div class="kpi-val">' + value + '</div>' + (sub ? '<div class="kpi-sub">' + sub + '</div>' : '');
    return href ? '<a class="kpi ' + (cls || '') + '" href="' + href + '">' + inner + '</a>' : '<div class="kpi ' + (cls || '') + '">' + inner + '</div>';
  }
  A.kpi = kpi;

  function qs(obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) { if (obj[k] !== '' && obj[k] !== undefined && obj[k] !== false) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])); });
    return parts.length ? '?' + parts.join('&') : '';
  }
  A.qs = qs;

  function showReceipt(p) {
    return api('fileView', p).then(function (r) {
      UI.sheet('Chek', '<img class="receipt" src="' + esc(r.data) + '" alt="chek">', {}, { wide: true });
    });
  }
  A.showReceipt = showReceipt;

  function markSheet(card, done) {
    var s = UI.sheet(card.ism + ' — ' + UI.date(card.sana), '<div class="stack">' +
      '<button class="btn ok-btn block" data-click="ok">✅ Yetkazildi</button>' +
      '<form data-submit="fail" class="stack card">' + UI.field('Yetkazib bo\'lmadi — sabab', '<select name="sabab">' +
        UI.options((A.reasons || []).map(function (r) { return { value: r.kod, label: r.nom }; })) + '</select>') +
      UI.field('Izoh', '<input name="izoh">') + '<button class="btn danger block">Belgilash</button></form></div>', {
      ok: function () { return api('deliveryMark', { id: card.id, holat: 'yetkazildi' }).then(function () { s.close(); done(); }); },
      fail: function (form) {
        var f = UI.formData(form);
        return api('deliveryMark', { id: card.id, holat: 'yetkazilmadi', sabab: f.sabab, izoh: f.izoh }).then(function () { s.close(); done(); });
      }
    });
  }

  // ---------- Bugun ----------
  function today() {
    return api('adminToday').then(function (d) {
      var t = d;
      var html = '<div class="row between wrap"><h1>Bugun <span class="muted small">' + UI.date(t.sana, true) + '</span></h1>' +
        '<a class="btn small ghost" href="#/help">📖 Yo\'riqnoma</a></div>';
      if (t.belgilanmagan.length) {
        html += '<div class="card danger-card"><h3>🔴 Belgilanmagan yetkazishlar: ' + t.belgilanmagan.length + '</h3><div class="list">' +
          t.belgilanmagan.map(function (c, i) {
            return '<button class="list-item link" data-click="mark" data-i="' + i + '"><div class="grow"><b>' + esc(c.ism) + '</b> · ' + UI.date(c.sana) +
              '<div class="small">' + esc(c.hudud) + ' · kuryer: ' + esc(c.kuryer || '—') + '</div></div><span>›</span></button>';
          }).join('') + '</div></div>';
      }
      html += '<div class="kpis">' +
        kpi('To\'lov kutmoqda', t.tolov_kutilmoqda.cheklar + ' chek', t.tolov_kutilmoqda.buyurtmalar + ' buyurtma', t.tolov_kutilmoqda.cheklar ? 'warn' : '', '#/orders?holat=tolov_kutish') +
        kpi('Bugungi yetkazish', t.bugun.yetkazildi + ' / ' + t.bugun.jami, 'qoldi ' + t.bugun.qoldi + (t.bugun.yetkazilmadi ? ', bo\'lmadi ' + t.bugun.yetkazilmadi : ''), '', '#/delivery') +
        kpi('Ertaga ratsion', t.ertaga.jami, 'oshxona uchun', '', '#/delivery?tab=kitchen') +
        kpi('Biriktirilmagan', t.biriktirilmagan, 'bugun va ertaga', t.biriktirilmagan ? 'warn' : '', '#/delivery') +
        '</div>';
      if (t.tolov_kutilmoqda.items.length) {
        html += '<div class="card"><h3>💳 Tasdiq kutayotgan to\'lovlar</h3><div class="list">' + t.tolov_kutilmoqda.items.map(function (p) {
          return '<a class="list-item link" href="#/orders/' + esc(p.buyurtma_id) + '"><div class="grow"><b>' + esc(p.mijoz) + '</b> — ' + som(p.summa) +
            '<div class="small muted">' + (p.usul === 'naqd' ? '💵 naqd' : '💳 karta' + (p.chek ? ', chek bor' : '')) + ' · ' + UI.dt(p.sana) + '</div></div><span>›</span></a>';
        }).join('') + '</div></div>';
      }
      html += '<div class="card"><h3>🍳 Ertangi oshxona hisoboti — ' + UI.date(t.ertaga.sana) + '</h3>' +
        (t.ertaga.ratsionlar.length ? '<table class="tbl"><tbody>' + t.ertaga.ratsionlar.map(function (r) {
          return '<tr><td>' + esc(r.ratsion) + '</td><td class="right"><b>' + r.soni + '</b></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="muted">Ertaga yetkazish yo\'q</p>') +
        '<p class="small muted">Kesish vaqti: ' + esc(t.kesish_vaqti) + '</p></div>';
      if (t.tugayotgan.length) {
        html += '<div class="card"><h3>⏳ Tugayotgan paketlar</h3><div class="list">' + t.tugayotgan.map(function (x) {
          return '<a class="list-item link" href="#/orders/' + esc(x.buyurtma_id) + '"><div class="grow"><b>' + esc(x.mijoz) + '</b> · ' + x.qolgan_kun + ' kun qoldi' +
            '<div class="small muted">' + esc(x.telefon) + ' · ' + UI.date(x.tugash) + '</div></div></a>';
        }).join('') + '</div></div>';
      }
      if (t.telefon_sorovlar) html += '<a class="card link warn" href="#/clients?telefon_sorov=1">📞 Telefon o\'zgartirish so\'rovlari: <b>' + t.telefon_sorovlar + '</b></a>';
      if (t.katta_xarajatlar) html += '<a class="card link warn" href="#/expenses">⚠️ Tasdiq kutayotgan katta xarajatlar: <b>' + t.katta_xarajatlar + '</b></a>';
      return api('deliveryBoard', {}, { silent: true }).then(function (b) {
        A.reasons = b.sabablar;
        UI.view(html, {
          mark: function (el) { markSheet(t.belgilanmagan[+el.dataset.i], UI.reload); }
        });
      });
    });
  }

  // ---------- Buyurtmalar ----------
  function orders(params, q) {
    return api('ordersList', q).then(function (d) {
      var html = '<div class="row between"><h1>Buyurtmalar</h1><button class="btn small" data-click="new">+ Buyurtma</button></div>' +
        '<form class="filters" data-submit="filter">' +
        '<input name="q" placeholder="Ism, telefon yoki ID" value="' + esc(q.q || '') + '">' +
        '<select name="holat">' + UI.options(Object.keys(d.holatlar).map(function (k) { return { value: k, label: d.holatlar[k] }; }), q.holat, { empty: 'Barcha holat' }) + '</select>' +
        '<select name="hudud">' + UI.options(d.hududlar, q.hudud, { empty: 'Barcha hudud' }) + '</select>' +
        '<input type="date" name="dan" value="' + esc(q.dan || '') + '" title="Dan"><input type="date" name="gacha" value="' + esc(q.gacha || '') + '" title="Gacha">' +
        '<label class="chk"><input type="checkbox" name="chek"' + (q.chek ? ' checked' : '') + '> Chek kutilmoqda</label>' +
        '<button class="btn small">Filtr</button></form>' +
        '<p class="small muted">Topildi: ' + d.jami + (d.jami > d.items.length ? ' (birinchi ' + d.items.length + ')' : '') + '</p>' +
        (d.items.length ? '<div class="table-wrap"><table class="tbl hover"><thead><tr><th>Mijoz</th><th>Ratsion</th><th>Sana</th><th>Summa</th><th>Holat</th><th>To\'lov</th></tr></thead><tbody>' +
          d.items.map(function (o) {
            return '<tr data-click="open" data-id="' + esc(o.id) + '"><td><b>' + esc(o.mijoz) + '</b><div class="small muted">' + esc(o.telefon) + ' · ' + esc(o.hudud || '') + '</div></td>' +
              '<td>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun' + (o.kim_yaratdi === 'admin' ? ' <span class="small muted">(admin)</span>' : '') + '</td>' +
              '<td class="nowrap">' + UI.dateShort(o.boshlanish) + ' — ' + UI.dateShort(o.tugash) + '</td>' +
              '<td class="right nowrap">' + money(o.tolanadi) + '</td>' +
              '<td>' + UI.statusBadge(o.holat, o.holat_nomi) + '</td>' +
              '<td>' + UI.statusBadge(o.tolov_holati, o.tolov_holati_nomi) + (o.chek_kutilmoqda ? ' 🧾' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : UI.empty('📦', 'Buyurtma topilmadi'));
      UI.view(html, {
        filter: function (form) {
          var f = UI.formData(form);
          location.hash = '#/orders' + qs(f);
        },
        open: function (el) { UI.go('orders/' + el.dataset.id); },
        'new': function () { pickClient(function (c) { UI.go('orders/new/' + c.id); }); }
      });
    });
  }

  function pickClient(cb) {
    var s = UI.sheet('Mijozni tanlang', '<input id="pcq" placeholder="Ism yoki telefon" autofocus><div id="pcl" class="list mt"></div>' +
      '<a class="btn ghost block mt" href="#/clients/new">+ Yangi mijoz</a>', {}, { wide: true });
    var inp = s.el.querySelector('#pcq');
    var t = null;
    var search = function () {
      api('clientsSearch', { q: inp.value }, { silent: true }).then(function (d) {
        UI.mount(s.el.querySelector('#pcl'), d.items.slice(0, 30).map(function (c, i) {
          return '<button class="list-item link" data-click="pick" data-i="' + i + '"><div class="grow"><b>' + esc(c.ism) + '</b><div class="small muted">' + esc(c.telefon) + ' · ' + esc(c.holat_nomi) + '</div></div></button>';
        }).join('') || '<p class="muted">Topilmadi</p>', { pick: function (el) { s.close(); cb(d.items[+el.dataset.i]); } });
      });
    };
    inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(search, 300); });
    search();
  }
  A.pickClient = pickClient;

  /** Mijoz nomidan qo'lda buyurtma (telefon orqali yozganlar uchun). */
  function orderNew(params) {
    return Promise.all([api('orderFormFor', { mijoz_id: params.mijoz }), api('clientGet', { id: params.mijoz })]).then(function (res) {
      var f = res[0], c = res[1].mijoz;
      var rations = f.katalog.ratsionlar;
      if (!rations.length) return UI.view(UI.empty('🍽', 'Avval "Narx va paketlar" bo\'limida ratsion va narx kiriting'));
      if (!f.manzillar.length) {
        return UI.view('<h1>Yangi buyurtma: ' + esc(c.ism) + '</h1>' + UI.empty('📍', 'Mijozning manzili yo\'q', '<a class="btn" href="#/clients/' + esc(c.id) + '">Manzil qo\'shish</a>'));
      }
      var workDays = f.kalendar.filter(function (d) { return d.ish_kuni; }).slice(0, 21);
      var html = '<a class="back" href="#/clients/' + esc(c.id) + '">‹ ' + esc(c.ism) + '</a><h1>Yangi buyurtma</h1>' +
        '<form class="card stack" data-submit="save" data-change="recalc">' +
        UI.field('Mijoz', '<input value="' + esc(c.ism + ' · ' + c.telefon) + '" disabled>') +
        UI.field('Ratsion', '<select name="ratsion_id">' + UI.options(rations.map(function (r) { return { value: r.id, label: r.nom + ' — ' + money(r.kunlik_narx) + '/kun' }; })) + '</select>') +
        UI.field('Necha kun (ish kuni)', '<input name="kunlar" type="number" inputmode="numeric" min="1" max="' + (f.katalog.max_kunlar || 320) + '" value="10" required>',
          f.katalog.paketlar.filter(function (p) { return p.chegirma_foiz > 0; }).map(function (p) { return p.kunlar + '+ kun — ' + p.chegirma_foiz + '%'; }).join(' · ')) +
        UI.field('Boshlanish', '<select name="boshlanish">' + UI.options(workDays.map(function (d) { return { value: d.sana, label: UI.date(d.sana, true) }; })) + '</select>') +
        UI.field('Manzil', '<select name="manzil_id">' + UI.options(f.manzillar.map(function (a) { return { value: a.id, label: a.nom + ' — ' + a.matn + ' (' + a.hudud + ')' }; })) + '</select>') +
        (f.keshbek_balans > 0 ? '<label class="chk"><input type="checkbox" name="use_cashback"> Keshbekdan ishlatish (balans ' + som(f.keshbek_balans) + ')</label>' : '') +
        '<div class="summary" id="sum"></div>' +
        '<fieldset class="stack"><legend>Darhol to\'lov (ixtiyoriy)</legend><div class="row gap">' +
        '<input name="tolov_summa" type="number" min="0" step="1000" placeholder="Summa" class="grow">' +
        '<select name="tolov_usul"><option value="naqd">Naqd</option><option value="karta">Karta</option></select></div></fieldset>' +
        UI.field('Izoh', '<input name="izoh" maxlength="300">') +
        '<button class="btn block">Buyurtma yaratish</button></form>';
      var read = function (form) {
        var d = UI.formData(form);
        d.mijoz_id = c.id;
        return d;
      };
      var quote = function () {
        var form = document.querySelector('form[data-submit=save]');
        var d = read(form);
        api('quoteFor', d, { silent: true }).then(function (q) {
          document.getElementById('sum').innerHTML = '<div class="row between"><span>Jami</span><b>' + som(q.jami) + '</b></div>' +
            (q.keshbek_ishlatildi ? '<div class="row between save"><span>Keshbekdan</span><span>−' + money(q.keshbek_ishlatildi) + '</span></div>' : '') +
            '<div class="row between total"><span>To\'lanadi</span><span>' + som(q.tolanadi) + '</span></div><div class="small muted">' +
            UI.date(q.boshlanish) + ' — ' + UI.date(q.tugash) + '</div>';
          var ts = form.querySelector('[name=tolov_summa]');
          if (!ts.dataset.touched) ts.placeholder = 'Summa (to\'liq: ' + q.tolanadi + ')';
        }).catch(function (e) { document.getElementById('sum').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
      };
      UI.view(html, {
        recalc: function (form, e) { if (e.target.name === 'tolov_summa') e.target.dataset.touched = 1; else quote(); },
        save: function (form) {
          var d = read(form);
          if (Number(d.tolov_summa) > 0) d.tolov = { summa: Number(d.tolov_summa), usul: d.tolov_usul };
          return api('orderCreate', d).then(function (o) { UI.toast('Buyurtma yaratildi'); UI.go('orders/' + o.id); });
        }
      });
      quote();
    });
  }

  function orderDetail(params) {
    return api('orderGet', { id: params.id }).then(function (o) { renderOrder(o); });
  }

  function renderOrder(o) {
    var due = o.tolanadi - o.tolangan;
    var html = '<a class="back" href="#/orders">‹ Buyurtmalar</a>' +
      '<div class="row between wrap"><h1>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun</h1><div>' + UI.statusBadge(o.holat, o.holat_nomi) + ' ' + UI.statusBadge(o.tolov_holati, o.tolov_holati_nomi) + '</div></div>' +
      '<div class="grid-2col"><div class="card"><h3>Mijoz</h3><a href="#/clients/' + esc(o.mijoz.id) + '"><b>' + esc(o.mijoz.ism) + '</b></a>' +
      '<div><a href="tel:' + esc(o.mijoz.telefon) + '">' + esc(o.mijoz.telefon) + '</a> · ' + esc(o.mijoz.manba) + '</div>' +
      '<div class="small mt">📍 ' + esc(o.manzil.matn) + (o.manzil.moljal ? ' (' + esc(o.manzil.moljal) + ')' : '') + ' · <b>' + esc(o.manzil.hudud) + '</b></div>' +
      ((o.holat === 'faol' || o.holat === 'tolov_kutish') ? '<button class="btn small ghost mt" data-click="addr">Manzilni o\'zgartirish</button>' : '') + '</div>' +
      '<div class="card"><h3>Summa</h3>' +
      '<div class="row between"><span>' + o.kunlar + ' × ' + money(o.kunlik_narx) + ' − ' + o.chegirma_foiz + '%</span><b>' + money(o.jami) + '</b></div>' +
      (o.keshbek_ishlatildi ? '<div class="row between"><span>Keshbekdan</span><span>−' + money(o.keshbek_ishlatildi) + '</span></div>' : '') +
      '<div class="row between total"><span>To\'lanadi</span><span>' + som(o.tolanadi) + '</span></div>' +
      '<div class="row between"><span>To\'langan</span><b>' + som(o.tolangan) + '</b></div>' +
      (o.qaytarilgan ? '<div class="row between"><span>Qaytarilgan</span><b>' + som(o.qaytarilgan) + '</b></div>' : '') +
      '<div class="small muted">Keshbek ' + o.keshbek_foiz + '% · yaratdi: ' + esc(o.kim_yaratdi) + ' · ' + UI.dt(o.yaratilgan) + '</div>' +
      (o.izoh ? '<div class="small">💬 ' + esc(o.izoh) + '</div>' : '') + '</div></div>' +
      '<div class="card"><div class="row between"><h3>To\'lovlar</h3>' + (o.holat !== 'bekor' ? '<button class="btn small" data-click="addPay">+ To\'lov</button>' : '') + '</div>' +
      (o.tolovlar.length ? '<div class="list">' + o.tolovlar.map(function (p) {
        return '<div class="list-item wrap"><div class="grow"><b>' + som(p.summa) + '</b> · ' + esc(p.usul) + ' · ' + UI.statusBadge(p.holat, p.holat) +
          '<div class="small muted">' + UI.date(p.sana) + (p.tasdiqlagan ? ' · ' + esc(p.tasdiqlagan.split(':')[1] || p.tasdiqlagan) : '') + (p.izoh ? ' · ' + esc(p.izoh) : '') + '</div></div>' +
          '<div class="row gap">' + (p.chek ? '<button class="btn small ghost" data-click="receipt" data-id="' + esc(p.id) + '">🧾 Chek</button>' : '') +
          (p.holat === 'kutilmoqda' ? '<button class="btn small ok-btn" data-click="confirm" data-id="' + esc(p.id) + '" data-sum="' + p.summa + '">Tasdiqlash</button>' +
            '<button class="btn small danger" data-click="reject" data-id="' + esc(p.id) + '">Rad</button>' : '') + '</div></div>';
      }).join('') + '</div>' : '<p class="muted">To\'lov yo\'q' + (due > 0 ? ' — kutilmoqda ' + som(due) : '') + '</p>') + '</div>';
    if (o.kunlar_jadvali.length) {
      html += '<div class="card"><h3>Kunlar <span class="small muted">qolgan ' + o.qolgan_kun + ', pauza ' + o.pauza + '/' + o.pauza_limit + '</span></h3>' +
        UI.calendar(o.kunlar_jadvali, {
          action: 'day',
          clickable: function (d) { return o.holat === 'faol' && (d.holat === 'rejada' || d.holat === 'pauza') && d.sana >= UI.today(); }
        }) + '<p class="hint">Kunni bosib pauza qiling yoki pauzani bekor qiling.</p></div>';
    }
    if (o.holat === 'faol' || o.holat === 'tolov_kutish') html += '<button class="btn danger ghost block" data-click="cancel">Buyurtmani bekor qilish</button>';
    UI.view(html, {
      receipt: function (el) { return showReceipt({ tolov_id: el.dataset.id }); },
      confirm: function (el) {
        var s = UI.sheet('To\'lovni tasdiqlash', '<form class="stack" data-submit="ok">' +
          UI.field('Qabul qilingan summa', '<input name="summa" type="number" min="1" step="1" value="' + el.dataset.sum + '" required>') +
          (o.holat === 'tolov_kutish' ? '<label class="chk"><input type="checkbox" name="faollashtirish"> Qisman bo\'lsa ham faollashtirish</label>' : '') +
          '<button class="btn ok-btn block">Tasdiqlash</button></form>', {
          ok: function (form) {
            var f = UI.formData(form);
            return api('paymentConfirm', { tolov_id: el.dataset.id, summa: Number(f.summa), faollashtirish: !!f.faollashtirish }).then(function (r) {
              s.close(); UI.toast(r.already ? 'Bu to\'lov avval tasdiqlangan' : 'Tasdiqlandi'); UI.haptic('success'); renderOrder(r.buyurtma);
            });
          }
        });
      },
      reject: function (el) {
        var s = UI.sheet('Rad etish', '<form class="stack" data-submit="no">' + UI.field('Sabab (mijozga yuboriladi)', '<input name="izoh" required maxlength="300">') +
          '<button class="btn danger block">Rad etish</button></form>', {
          no: function (form) {
            return api('paymentReject', { tolov_id: el.dataset.id, izoh: UI.formData(form).izoh }).then(function (no) { s.close(); renderOrder(no); });
          }
        });
      },
      addPay: function () {
        var s = UI.sheet('To\'lov kiritish', '<form class="stack" data-submit="add">' +
          UI.field('Summa', '<input name="summa" type="number" min="1" step="1" value="' + Math.max(0, due) + '" required>') +
          UI.field('Usul', '<select name="usul"><option value="naqd">Naqd</option><option value="karta">Karta</option></select>') +
          UI.field('Izoh', '<input name="izoh">') +
          (o.holat === 'tolov_kutish' ? '<label class="chk"><input type="checkbox" name="faollashtirish"> Qisman bo\'lsa ham faollashtirish</label>' : '') +
          '<button class="btn block">Saqlash va tasdiqlash</button></form>', {
          add: function (form) {
            var f = UI.formData(form);
            f.buyurtma_id = o.id; f.summa = Number(f.summa);
            return api('paymentAdd', f).then(function (no) { s.close(); renderOrder(no); });
          }
        });
      },
      day: function (el) {
        var d = o.kunlar_jadvali.filter(function (x) { return x.id === el.dataset.id; })[0];
        var pause = d.holat === 'rejada';
        return UI.confirm(UI.date(d.sana, true) + (pause ? ' — pauza qilinsinmi?' : ' — pauza bekor qilinsinmi?'), pause ? 'Pauza' : 'Bekor qilish').then(function (y) {
          if (!y) return;
          return api(pause ? 'orderPause' : 'orderUnpause', { buyurtma_id: o.id, yetkazish_id: d.id }).then(renderOrder);
        });
      },
      addr: function () {
        return api('clientGet', { id: o.mijoz.id }).then(function (c) {
          var s = UI.sheet('Manzil', '<div class="list">' + c.manzillar.map(function (a) {
            return '<button class="list-item link" data-click="pick" data-id="' + esc(a.id) + '"><div class="grow"><b>' + esc(a.nom) + '</b> · ' + esc(a.hudud) + '<div class="small">' + esc(a.matn) + '</div></div></button>';
          }).join('') + '</div>', {
            pick: function (b) { return api('orderAddress', { buyurtma_id: o.id, manzil_id: b.dataset.id }).then(function (no) { s.close(); renderOrder(no); }); }
          });
        });
      },
      cancel: function () {
        return api('orderCancelPreview', { id: o.id }).then(function (pv) {
          var s = UI.sheet('Bekor qilish', '<div class="stack">' +
            '<table class="tbl"><tbody>' +
            '<tr><td>Ishlatilgan kunlar</td><td class="right">' + pv.ishlatilgan_kunlar + '</td></tr>' +
            '<tr><td>Bekor bo\'ladigan kunlar</td><td class="right">' + pv.bekor_kunlar + '</td></tr>' +
            (pv.ishlatilgan_kunlar ? '<tr><td>Qayta hisob (chegirma ' + pv.qayta_chegirma_foiz + '%)</td><td class="right">' + money(pv.ushlab_qolinadi) + '</td></tr>' : '') +
            '<tr><td>To\'langan</td><td class="right">' + money(pv.tolangan) + '</td></tr>' +
            '<tr><td><b>Qaytariladigan pul</b></td><td class="right"><b>' + money(pv.qaytariladigan_pul) + '</b></td></tr>' +
            '<tr><td>Keshbekka qaytadi</td><td class="right">' + money(pv.qaytariladigan_keshbek) + '</td></tr>' +
            '<tr><td>Keshbek olib qolinadi</td><td class="right">' + money(pv.keshbek_olib_qolinadi) + '</td></tr></tbody></table>' +
            '<form class="stack" data-submit="go">' + UI.field('Sabab', '<input name="sabab" required maxlength="200">') +
            '<button class="btn danger block">Bekor qilish</button></form></div>', {
            go: function (form) {
              return api('orderCancel', { id: o.id, sabab: UI.formData(form).sabab }).then(function (r) { s.close(); UI.toast('Bekor qilindi'); renderOrder(r.buyurtma); });
            }
          });
        });
      }
    });
  }

  // ---------- Mijozlar ----------
  function clients(params, q) {
    return api('clientsSearch', q).then(function (d) {
      var html = '<div class="row between"><h1>Mijozlar</h1><a class="btn small" href="#/clients/new">+ Mijoz</a></div>' +
        '<form class="filters" data-submit="filter"><input name="q" placeholder="Ism yoki telefon" value="' + esc(q.q || '') + '">' +
        '<select name="holat">' + UI.options(Object.keys(d.holatlar).map(function (k) { return { value: k, label: d.holatlar[k] }; }), q.holat, { empty: 'Barcha holat' }) + '</select>' +
        '<select name="manba">' + UI.options(d.manbalar, q.manba, { empty: 'Barcha manba' }) + '</select>' +
        '<label class="chk"><input type="checkbox" name="telefon_sorov"' + (q.telefon_sorov ? ' checked' : '') + '> Telefon so\'rovi</label>' +
        '<button class="btn small">Qidirish</button></form><p class="small muted">Topildi: ' + d.jami + '</p>' +
        (d.items.length ? '<div class="list">' + d.items.map(function (c) {
          return '<a class="list-item link" href="#/clients/' + esc(c.id) + '"><div class="grow"><div class="row between"><b>' + esc(c.ism) + '</b>' + UI.statusBadge(c.holat, c.holat_nomi) + '</div>' +
            '<div class="small muted">' + esc(c.telefon) + ' · ' + esc(c.manba) + ' · ' + UI.date(c.royxatdan_sana) + (c.telegram ? '' : ' · Telegramsiz') +
            (c.telefon_sorov ? ' · <span class="neg">📞 so\'rov</span>' : '') + '</div></div></a>';
        }).join('') + '</div>' : UI.empty('👥', 'Mijoz topilmadi'));
      UI.view(html, { filter: function (form) { location.hash = '#/clients' + qs(UI.formData(form)); } });
    });
  }

  function clientNew() {
    return api('clientsSearch', { q: '___' }).then(function (meta) {
        UI.view('<a class="back" href="#/clients">‹ Mijozlar</a><h1>Yangi mijoz</h1><form class="card stack" data-submit="save">' +
          UI.field('Ism', '<input name="ism" required maxlength="80">') +
          UI.field('Telefon', '<input name="telefon" type="tel" required placeholder="+998 90 123 45 67">') +
          UI.field('Manba', '<select name="manba">' + UI.options(meta.manbalar) + '</select>') +
          UI.field('Izoh', '<input name="izoh" maxlength="500">') +
          '<button class="btn block">Saqlash</button></form><p class="hint">Manzilni keyingi qadamda xaritada qo\'shasiz.</p>', {
          save: function (form) {
            return api('clientCreate', UI.formData(form)).then(function (c) { UI.toast('Mijoz qo\'shildi'); UI.go('clients/' + c.id); });
          }
        });
    });
  }

  function clientDetail(params) {
    return api('clientGet', { id: params.id }).then(function (d) {
      var c = d.mijoz;
      var isPartner = A.me.rol === 'sherik';
      var html = '<a class="back" href="#/clients">‹ Mijozlar</a><div class="row between wrap"><h1>' + esc(c.ism) + '</h1>' + UI.statusBadge(c.holat, c.holat_nomi) + '</div>' +
        '<div class="grid-2col"><form class="card stack" data-submit="save"><h3>Profil</h3>' +
        UI.field('Ism', '<input name="ism" value="' + esc(c.ism) + '" required>') +
        UI.field('Telefon', '<input name="telefon" value="' + esc(c.telefon) + '" required>') +
        UI.field('Manba', '<select name="manba">' + UI.options(d.manbalar, c.manba) + '</select>') +
        UI.field('Izoh', '<input name="izoh" value="' + esc(c.izoh) + '">') +
        '<div class="small muted">Ro\'yxat: ' + UI.date(c.royxatdan_sana) + ' · ' + (c.telegram ? 'Telegram ulangan' : 'Telegramsiz') + '</div>' +
        '<button class="btn">Saqlash</button></form>' +
        '<div class="card"><h3>Keshbek: ' + som(d.keshbek.balans) + '</h3>' +
        '<form class="row gap wrap" data-submit="adj"><input name="summa" type="number" step="1" placeholder="± summa" required class="grow">' +
        '<input name="izoh" placeholder="Izoh (majburiy)" required class="grow"><button class="btn small">Tuzatish</button></form>' +
        '<div class="list mt scroll-y">' + d.keshbek.tarix.map(function (e) {
          return '<div class="list-item"><div class="grow small"><b>' + esc(e.tur_nomi) + '</b> · ' + UI.date(e.sana) + (e.izoh ? ' · ' + esc(e.izoh) : '') + '</div><b class="' + (e.summa > 0 ? 'save' : 'neg') + '">' + money(e.summa) + '</b></div>';
        }).join('') + '</div></div></div>';
      if (c.telefon_sorov) {
        html += '<div class="card warn"><b>📞 Telefonni ' + esc(c.telefon_sorov) + ' ga o\'zgartirish so\'rovi</b><div class="row gap mt">' +
          '<button class="btn small ok-btn" data-click="phoneYes">Tasdiqlash</button><button class="btn small danger" data-click="phoneNo">Rad etish</button></div></div>';
      }
      var sh = d.salomatlik || {};
      if (sh.vazn || sh.maqsad) {
        html += '<div class="card"><h3>🎯 Kaloriya va vazn</h3><div class="grid2 small">' +
          '<div><div class="muted">Maqsad</div><b>' + esc(sh.maqsad || '—') + '</b></div>' +
          '<div><div class="muted">Turmush tarzi</div><b>' + esc(sh.faollik || '—') + '</b></div>' +
          '<div><div class="muted">Bo\'y / vazn</div><b>' + (sh.boy || '—') + ' sm / ' + (sh.vazn || '—') + ' kg</b></div>' +
          '<div><div class="muted">Tavsiya</div><b>' + (sh.tavsiya ? esc(sh.tavsiya.ratsion) + ' (' + money(sh.kkal) + ' kkal)' : '—') + '</b></div></div>' +
          (sh.statistika ? '<div class="mt">Vazn: ' + sh.statistika.boshlangich + ' kg (' + UI.date(sh.statistika.boshlangich_sana) + ') → <b>' + sh.statistika.joriy + ' kg</b> (' +
            UI.date(sh.statistika.joriy_sana) + ') · <b class="' + (sh.statistika.ozgarish < 0 ? 'save' : '') + '">' + (sh.statistika.ozgarish > 0 ? '+' : '') + sh.statistika.ozgarish + ' kg</b></div>' : '') +
          '</div>';
      }
      html += '<div class="card"><div class="row between"><h3>Buyurtmalar</h3><a class="btn small" href="#/orders/new/' + esc(c.id) + '">+ Buyurtma</a></div>' +
        (d.buyurtmalar.length ? '<div class="list">' + d.buyurtmalar.map(function (o) {
          return '<a class="list-item link" href="#/orders/' + esc(o.id) + '"><div class="grow"><b>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun</b> · ' + money(o.tolanadi) +
            '<div class="small muted">' + UI.date(o.boshlanish) + ' — ' + UI.date(o.tugash) + ' · ' + esc(o.kim_yaratdi) + '</div></div>' + UI.statusBadge(o.holat, o.holat_nomi) + '</a>';
        }).join('') + '</div>' : '<p class="muted">Buyurtma yo\'q</p>') + '</div>' +
        '<div class="card"><div class="row between"><h3>Manzillar</h3><button class="btn small" data-click="addAddr">+ Manzil</button></div>' +
        (d.manzillar.length ? '<div class="list">' + d.manzillar.map(function (a, i) {
          return '<button class="list-item link" data-click="editAddr" data-i="' + i + '"><div class="grow"><b>' + esc(a.nom) + '</b> · ' + esc(a.hudud) + '<div class="small">' + esc(a.matn) + (a.moljal ? ' (' + esc(a.moljal) + ')' : '') + '</div></div>' + (a.lat !== '' ? '📍' : '') + '</button>';
        }).join('') + '</div>' : '<p class="muted">Manzil yo\'q</p>') + '</div>' +
        (isPartner ? '<button class="btn link-btn danger-text block" data-click="anon">Shaxsiy ma\'lumotlarni anonimlashtirish (mijoz so\'roviga ko\'ra)</button>' : '');
      var addrSheet = function (a) {
        var s = UI.sheet(a.id ? 'Manzilni tahrirlash' : 'Yangi manzil', '<div id="cad"></div>', {}, { wide: true });
        AddrForm.form(s.el.querySelector('#cad'), {
          addr: a, hududlar: d.hududlar,
          onSubmit: function (data) {
            data.mijoz_id = c.id;
            return api('clientAddressSave', data).then(function () { s.close(); UI.reload(); });
          }
        });
      };
      UI.view(html, {
        save: function (form) { return api('clientUpdate', Object.assign({ id: c.id }, UI.formData(form))).then(function () { UI.toast('Saqlandi'); UI.reload(); }); },
        adj: function (form) {
          var f = UI.formData(form);
          return api('cashbackAdjust', { mijoz_id: c.id, summa: Number(f.summa), izoh: f.izoh }).then(function () { UI.toast('Keshbek tuzatildi'); UI.reload(); });
        },
        phoneYes: function () { return api('phoneChange', { id: c.id, tasdiq: true }).then(UI.reload); },
        phoneNo: function () { return api('phoneChange', { id: c.id, tasdiq: false }).then(UI.reload); },
        addAddr: function () { addrSheet({ nom: 'Uy' }); },
        editAddr: function (el) { addrSheet(d.manzillar[+el.dataset.i]); },
        anon: function () {
          return UI.confirm('Ism, telefon va manzillar o\'chiriladi (buyurtma va pul yozuvlari hisob uchun qoladi). Qaytarib bo\'lmaydi.', 'Anonimlashtirish', true).then(function (y) {
            if (y) return api('clientAnonymize', { id: c.id }).then(function () { UI.toast('Anonimlashtirildi'); UI.go('clients'); });
          });
        }
      });
    });
  }

  // ---------- Menyu (katalog rasmlari) ----------
  function menu() {
    UI.view('<h1>Menyu</h1><div id="catalogBox" class="card"><div class="spinner small"></div></div>' +
      '<div class="card help-tip">🍽 Menyu 6 kunlik: dushanba — 1-kun, seshanba — 2-kun ... shanba — 6-kun (yakshanba dam). ' +
      'Hamma kaloriya variantiga bir xil ovqat tayyorlanadi, faqat porsiya miqdori farq qiladi. ' +
      'Menyu o\'zgarganda eski rasmni ✕ bilan olib tashlab, yangisini qo\'shing. ' +
      'Kaloriya va narxlar: <a href="#/pricing">Narx va paketlar</a>.</div>');
    A.loadCatalogBox();
  }

  // ---------- Vazn statistikasi ----------
  function weights() {
    return api('weightStats').then(function (d) {
      var html = '<h1>⚖️ Vazn statistikasi</h1>' +
        '<div class="kpis">' + kpi('Vazn kiritgan', d.jami) + kpi('Ozdi', d.ozdi) + kpi('Vazn oldi', d.vazn_oldi) +
        kpi('O\'rtacha o\'zgarish', (d.ortacha_ozgarish > 0 ? '+' : '') + d.ortacha_ozgarish + ' kg') + '</div>' +
        '<p class="hint">Mijozlar ilovada "Kaloriya va vazn" bo\'limida vaznini kiritadi; bot har necha kunda bir so\'raydi (Sozlamalar → Buyurtma qoidalari).</p>';
      html += d.items.length ? '<div class="table-wrap card"><table class="tbl"><thead><tr><th>Mijoz</th><th>Maqsad</th><th>Boshida</th><th>Hozir</th><th>O\'zgarish</th></tr></thead><tbody>' +
        d.items.map(function (x) {
          return '<tr><td><a href="#/clients/' + esc(x.mijoz_id) + '">' + esc(x.ism) + '</a></td><td>' + esc(x.maqsad) + '</td>' +
            '<td>' + x.boshlangich + ' kg<div class="small muted">' + UI.date(x.boshlangich_sana) + '</div></td>' +
            '<td>' + x.joriy + ' kg<div class="small muted">' + UI.date(x.joriy_sana) + '</div></td>' +
            '<td class="' + (x.ozgarish < 0 ? 'save' : '') + '"><b>' + (x.ozgarish > 0 ? '+' : '') + x.ozgarish + ' kg</b></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.empty('⚖️', 'Hali hech kim vazn kiritmagan');
      UI.view(html);
    });
  }

  // ---------- Yetkazish ----------
  function delivery(params, q) {
    var date = q.sana || UI.today();
    if (q.tab === 'kitchen') return kitchen(q);
    return api('deliveryBoard', { sana: date }).then(function (b) {
      A.reasons = b.sabablar;
      var cards = {};
      var html = '<div class="row between wrap"><h1>Yetkazish</h1><div class="tabs"><a class="on" href="#/delivery">Ro\'yxat</a><a href="#/delivery?tab=kitchen&sana=' + UI.addDays(date, date === UI.today() ? 1 : 0) + '">Oshxona hisoboti</a></div></div>' +
        '<form class="filters" data-change="date"><input type="date" name="sana" value="' + date + '">' +
        '<a class="btn small ghost" href="#/delivery?sana=' + UI.today() + '">Bugun</a><a class="btn small ghost" href="#/delivery?sana=' + UI.addDays(UI.today(), 1) + '">Ertaga</a></form>' +
        '<div class="kpis">' + kpi('Jami', b.jami) + kpi('Yetkazildi', b.yetkazildi) + kpi('Qoldi', b.qoldi) +
        kpi('Biriktirilmagan', b.biriktirilmagan, '', b.biriktirilmagan ? 'warn' : '') + '</div>' +
        (A.me.rol === 'sherik' ? '<button class="btn small ghost" data-click="sendList">📨 ' + UI.date(date) + ' ro\'yxatini Telegram guruhga yuborish</button>' : '');
      if (!b.kuryerlar.length) html += '<div class="card warn">Kuryer qo\'shilmagan. "Foydalanuvchilar" bo\'limida kuryer rolini qo\'shing.</div>';
      b.guruhlar.forEach(function (g) {
        html += '<div class="card"><div class="row between wrap"><h3>📍 ' + esc(g.hudud) + ' <span class="muted">(' + g.qoldi + '/' + g.soni + ')</span></h3>' +
          '<form class="row gap" data-submit="assign" data-hudud="' + esc(g.hudud) + '"><select name="kuryer_id">' +
          UI.options(b.kuryerlar.map(function (k) { return { value: k.id, label: k.ism }; }), b.hudud_kuryer[g.hudud] || '', { empty: '— kuryer —' }) + '</select>' +
          '<label class="chk small"><input type="checkbox" name="eslab_qol" checked> keyingi kunlar ham</label><button class="btn small">Biriktirish</button></form></div>' +
          '<div class="list">' + g.items.map(function (c) {
            cards[c.id] = c;
            return '<div class="list-item wrap ' + (c.holat === 'rejada' && !c.kuryer_id ? 'unassigned' : '') + '"><div class="grow"><b>' + esc(c.ism) + '</b> · ' + esc(c.ratsion) +
              ' ' + UI.statusBadge(c.holat, c.holat_nomi) + '<div class="small">' + esc(c.manzil) + (c.moljal ? ' (' + esc(c.moljal) + ')' : '') + '</div>' +
              '<div class="small muted">' + esc(c.telefon) + ' · kuryer: ' + esc(c.kuryer || '—') + (c.sabab ? ' · ' + esc(c.sabab) : '') + '</div></div>' +
              (c.holat === 'rejada' ? '<button class="btn small ghost" data-click="mark" data-id="' + esc(c.id) + '">Belgilash</button>' : '') + '</div>';
          }).join('') + '</div></div>';
      });
      if (!b.jami) html += UI.empty('🛵', 'Bu kunda yetkazish yo\'q');
      UI.view(html, {
        date: function (form) { location.hash = '#/delivery?sana=' + UI.formData(form).sana; },
        assign: function (form) {
          var f = UI.formData(form);
          return api('assignCourier', { hudud: form.dataset.hudud, sana: date, kuryer_id: f.kuryer_id, eslab_qol: f.eslab_qol }).then(function (r) {
            UI.toast('Biriktirildi: ' + r.biriktirildi); UI.reload();
          });
        },
        mark: function (el) { markSheet(cards[el.dataset.id], UI.reload); },
        sendList: function () { return api('sendBackupList', { sana: date }).then(function () { UI.toast('Yuborildi'); }); }
      });
    });
  }

  function kitchen(q) {
    var date = q.sana || UI.addDays(UI.today(), 1);
    return api('kitchen', { sana: date }).then(function (k) {
      var html = '<div class="row between wrap"><h1>Oshxona hisoboti</h1><div class="tabs"><a href="#/delivery">Ro\'yxat</a><a class="on" href="#/delivery?tab=kitchen">Oshxona hisoboti</a></div></div>' +
        '<form class="filters" data-change="date"><input type="date" name="sana" value="' + date + '"></form>' +
        '<div class="card center"><div class="muted">' + UI.date(k.sana, true) + '</div><div class="huge">' + k.jami + '</div><div class="muted">ta ratsion</div></div>' +
        k.ratsionlar.map(function (r) {
          return '<div class="card"><div class="row between"><h3>' + esc(r.ratsion) + '</h3><span class="big">' + r.soni + '</span></div>' +
            '<div class="small muted">' + r.hududlar.map(function (h) { return esc(h.hudud) + ': ' + h.soni; }).join(' · ') + '</div></div>';
        }).join('');
      UI.view(html, { date: function (form) { location.hash = '#/delivery?tab=kitchen&sana=' + UI.formData(form).sana; } });
    });
  }

  A.routes1 = function () {
    UI.route('', today);
    UI.route('orders', orders);
    UI.route('orders/new/:mijoz', orderNew);
    UI.route('orders/:id', orderDetail);
    UI.route('clients', clients);
    UI.route('clients/new', clientNew);
    UI.route('clients/:id', clientDetail);
    UI.route('menu-edit', menu);
    UI.route('weights', weights);
    UI.route('delivery', delivery);
  };
})();

/* Menyu rasmlari (katalog): yuklash, tartiblash, olib tashlash. */
(function () {
  'use strict';
  var A = window.AdminApp;
  var esc = UI.esc;
  function render(box, c) {
    UI.mount(box, '<div class="row between wrap"><h3>🍽 Menyu rasmlari</h3>' +
      '<label class="btn small upload">+ Rasm qo\'shish<input type="file" accept="image/*" multiple hidden data-change="add"></label></div>' +
      '<p class="hint">Mijoz ilovada "🍽 Menyu" bo\'limida ko\'radi. ' +
      'Ko\'pi bilan 12 ta rasm.</p>' +
      (c.rasmlar.length ? '<div class="catalog-grid">' + c.rasmlar.map(function (x, i) {
        return '<div class="catalog-thumb"><img src="' + esc(x.url) + '" alt=""><div class="row gap">' +
          (i > 0 ? '<button class="btn small ghost" data-click="up" data-i="' + i + '" title="Oldinga">↑</button>' : '') +
          '<button class="btn small danger" data-click="del" data-i="' + i + '" title="Olib tashlash">✕</button></div>' +
          '<div class="small muted">' + (i + 1) + '-rasm · ' + UI.date(x.yuklangan) + '</div></div>';
      }).join('') + '</div>' : '<p class="muted">Menyu rasmi hali joylanmagan.</p>'), {
      add: function (el) {
        var files = Array.prototype.slice.call(el.files || []);
        if (!files.length) return;
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            return UI.compressImage(f, 2000).then(function (data) {
              return UI.api('catalogAdd', { rasm: data, nom: f.name.replace(/\.[^.]+$/, '') });
            }).then(function (res) { c = res; });
          });
        });
        return chain.then(function () { UI.toast('Menyu yangilandi'); render(box, c); });
      },
      up: function (el) { return UI.api('catalogMove', { i: Number(el.dataset.i), yon: 'yuqori' }).then(function (res) { c = res; render(box, c); }); },
      del: function (el) {
        return UI.confirm(Number(el.dataset.i) + 1 + '-rasm olib tashlansinmi?', 'Olib tashlash', true).then(function (y) {
          if (y) return UI.api('catalogRemove', { i: Number(el.dataset.i) }).then(function (res) { c = res; render(box, c); });
        });
      }
    });
  }
  A.loadCatalogBox = function () {
    var box = document.getElementById('catalogBox');
    if (!box) return;
    UI.api('catalog', {}, { silent: true }).then(function (c) { render(box, c); }).catch(function (e) { box.textContent = e.message; });
  };
})();
