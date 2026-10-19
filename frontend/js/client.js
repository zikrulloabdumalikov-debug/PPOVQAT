/* Mijoz kabineti (TZ 6-bo'lim): ro'yxatdan o'tish, bosh sahifa, buyurtma, chegirmalar, keshbek, buyurtmalar, manzillar, profil. */
(function () {
  'use strict';
  var esc = UI.esc, som = UI.som, api = UI.api;

  // ---------- 1. Ro'yxatdan o'tish ----------
  function registration(me) {
    var r = me.royxat || {};
    var phone = r.telefon || '';
    var pollTimer = null;
    var html =
      '<div class="hero"><div class="hero-ico">🥗</div><h1>Xush kelibsiz!</h1><p class="muted">3 qadamda ro\'yxatdan o\'ting va birinchi buyurtmangizni bering</p></div>' +
      '<div class="card"><h3><span class="step">1</span> Telefon raqam</h3><div id="phoneBox"></div></div>' +
      '<div class="card"><h3><span class="step">2</span> Siz haqingizda</h3>' +
      UI.field('Ismingiz', '<input id="regName" maxlength="80" value="' + esc(me.ism || '') + '" placeholder="Ism">') +
      '<div class="field"><span class="field-label">Bizni qayerdan topdingiz?</span><div class="chips" id="srcChips">' +
      (r.manbalar || []).map(function (s, i) {
        return '<label class="chip"><input type="radio" name="manba" value="' + esc(s) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
      }).join('') + '</div></div></div>' +
      '<div class="card"><h3><span class="step">3</span> Yetkazish manzili</h3><div id="addrBox"></div>' +
      '<label class="consent"><input type="checkbox" id="regConsent"> <span>' + esc(r.rozilik_matni || '') + '</span></label></div>';
    UI.view(html);
    document.body.classList.remove('has-nav');

    var renderPhone = function () {
      var box = document.getElementById('phoneBox');
      if (phone) {
        box.innerHTML = '<div class="ok-line">✅ ' + esc(phone) + '</div>';
        return;
      }
      UI.mount(box, '<p class="muted small">Raqam Telegram orqali olinadi — qo\'lda yozilmaydi.</p>' +
        '<button class="btn block" data-click="share">📱 Raqamni ulashish</button>' +
        '<p class="hint">Agar tugma ishlamasa: bot chatida pastdagi "📱 Raqamni yuborish" tugmasini bosing, keyin bu yerga qayting.</p>', {
        share: function () {
          var tg = UI.tg;
          if (tg && tg.requestContact) {
            tg.requestContact(function (ok) { if (ok) poll(30); else UI.toast('Raqam ulashilmadi', 'err'); });
          } else {
            UI.toast('Bot chatida "📱 Raqamni yuborish" tugmasini bosing');
            poll(60);
          }
        }
      });
    };
    var poll = function (times) {
      clearTimeout(pollTimer);
      api('contactStatus', {}, { silent: true }).then(function (res) {
        if (res.telefon) { phone = res.telefon; renderPhone(); UI.haptic('success'); return; }
        if (times > 0) pollTimer = setTimeout(function () { poll(times - 1); }, 2000);
      }).catch(function () { if (times > 0) pollTimer = setTimeout(function () { poll(times - 1); }, 3000); });
    };
    renderPhone();
    if (!phone) poll(5);

    AddrForm.form(document.getElementById('addrBox'), {
      addr: { nom: 'Uy' }, hududlar: r.hududlar, submitLabel: 'Ro\'yxatdan o\'tish', telegramLocation: true,
      onSubmit: function (addr) {
        if (!phone) { UI.toast('Avval telefon raqamni ulashing', 'err'); return; }
        var src = document.querySelector('input[name=manba]:checked');
        if (!document.getElementById('regConsent').checked) { UI.toast('Rozilik belgisini qo\'ying', 'err'); return; }
        return api('register', {
          ism: document.getElementById('regName').value, manba: src ? src.value : 'Boshqa',
          rozilik: true, manzil: addr
        }).then(function () {
          UI.haptic('success');
          clearTimeout(pollTimer);
          location.hash = '#/order';
          location.reload();
        });
      }
    });
  }

  // ---------- 2. Bosh sahifa ----------
  function menuBlock(title, items) {
    if (!items.length) return '<div class="menu-day"><div class="muted small">' + title + '</div><div class="muted">Menyu hali kiritilmagan</div></div>';
    return '<div class="menu-day"><div class="muted small">' + title + '</div>' + items.map(function (m) {
      return '<div class="menu-item"><b>' + esc(m.ratsion) + '</b>' + (m.kaloriya ? ' · ' + esc(m.kaloriya) + ' kkal' : '') + '<div>' + esc(m.taomlar) + '</div></div>';
    }).join('') + '</div>';
  }

  function home() {
    return api('home').then(function (d) {
      var p = d.faol_paket;
      var html = '<h1>Salom, ' + esc(d.ism) + '!</h1>';
      d.tolov_kutilmoqda.forEach(function (o) {
        html += '<a class="card warn link" href="#/pay/' + esc(o.id) + '"><div class="row between"><b>💳 To\'lov kutilmoqda</b><span>›</span></div>' +
          '<div>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun — <b>' + som(o.tolanadi - o.tolangan) + '</b></div>' +
          '<div class="small muted">' + (o.chek_yuborilgan ? 'Chek yuborildi, admin tasdiqlashi kutilmoqda' : 'To\'lab, chek rasmini yuboring') + '</div></a>';
      });
      if (p) {
        html += '<div class="card"><div class="row between"><h3>' + esc(p.ratsion) + '</h3>' + UI.statusBadge('faol', 'Faol') + '</div>' +
          '<div class="big">' + p.qolgan_kun + ' <span class="muted small">/ ' + p.kunlar + ' kun qoldi</span></div>' + UI.progress(p.foiz) +
          '<div class="row between small muted mt"><span>' + UI.date(p.boshlanish) + '</span><span>' + UI.date(p.tugash) + '</span></div>' +
          (p.ertaga ? '<div class="small mt">Ertaga: ' + UI.statusBadge(p.ertaga.holat, p.ertaga.holat_nomi) + '</div>' : '') +
          '<div class="row gap mt"><a class="btn ghost grow" href="#/orders/' + esc(p.id) + '">Kunlar va pauza</a>' +
          '<a class="btn grow" href="#/order">Davom ettirish</a></div></div>';
      } else if (!d.tolov_kutilmoqda.length) {
        html += '<div class="card accent"><h3>Faol paketingiz yo\'q</h3><p>Ratsion va paketni tanlang — uzoqroq paketda chegirma va keshbek ko\'proq.</p>' +
          '<a class="btn block" href="#/order">🛒 Buyurtma berish</a></div>';
      }
      html += '<a class="card link" href="#/cashback"><div class="row between"><div><div class="muted small">Keshbek balansi</div><div class="big">' +
        som(d.keshbek) + '</div></div><span class="big-ico">💰</span></div></a>';
      if (d.katalog_bor) {
        html += '<a class="card link accent" href="#/catalog"><div class="row between"><div><b>📚 Oylik katalog</b>' +
          '<div class="small muted">Yangi taomlar va takliflar</div></div><span>›</span></div></a>';
      }
      if (d.menyu.bugun.length || d.menyu.ertaga.length) {
        html += '<div class="card"><h3>Menyu</h3>' + menuBlock('Bugun', d.menyu.bugun) + menuBlock('Ertaga', d.menyu.ertaga) + '</div>';
      } else if (d.doimiy_menyu.length) {
        html += '<div class="card"><h3>Menyu</h3>' + d.doimiy_menyu.map(function (m) {
          return '<div class="menu-item"><b>' + esc(m.ratsion) + '</b>' + (m.kaloriya ? ' · ' + esc(m.kaloriya) + ' kkal' : '') + '<div>' + esc(m.taomlar) + '</div></div>';
        }).join('') + '</div>';
      }
      html += '<a class="card link" href="#/discounts"><div class="row between"><b>🏷 Chegirmalar va paketlar</b><span>›</span></div>' +
        '<div class="small muted">Qancha tejashingizni ko\'ring</div></a>';
      if (d.aloqa) html += '<p class="center small muted">Savollar: <a href="tel:' + esc(d.aloqa) + '">' + esc(d.aloqa) + '</a> · Yetkazish ' + esc(d.yetkazish_vaqti) + '</p>';
      UI.view(html);
    });
  }

  // ---------- 3. Buyurtma berish ----------
  function orderPage(params, query) {
    return api('orderForm').then(function (f) {
      var rations = f.katalog.ratsionlar;
      if (!rations.length) { UI.view(UI.empty('🍽', 'Hozircha sotuvda ratsion yo\'q')); return; }
      var st = {
        ratsion_id: query.ratsion || rations[0].id,
        paket_id: '',
        boshlanish: f.eng_erta,
        manzil_id: f.manzillar.length ? f.manzillar[0].id : '',
        use_cashback: false
      };
      var ration = function () { return rations.filter(function (r) { return r.id === st.ratsion_id; })[0] || rations[0]; };
      if (!st.paket_id) {
        var pk = ration().paketlar;
        st.paket_id = (pk[1] || pk[0] || {}).paket_id || '';
      }
      var workDays = f.kalendar.filter(function (d) { return d.ish_kuni; }).slice(0, 14);

      var render = function () {
        var r = ration();
        var html = '<h1>Buyurtma berish</h1>' +
          '<h3 class="sec">1. Ratsion</h3><div class="chips">' + rations.map(function (x) {
            return '<button class="chip-btn ' + (x.id === st.ratsion_id ? 'on' : '') + '" data-click="ration" data-id="' + esc(x.id) + '">' +
              esc(x.nom) + (x.kaloriya ? ' · ' + esc(x.kaloriya) + ' kkal' : '') + '</button>';
          }).join('') + '</div>' + (r.tavsif ? '<div class="menu-text small">' + esc(r.tavsif) + '</div>' : '') +
          '<h3 class="sec">2. Paket</h3><div class="pkgs">' + r.paketlar.map(function (p) {
            return '<button class="pkg ' + (p.paket_id === st.paket_id ? 'on' : '') + '" data-click="pkg" data-id="' + esc(p.paket_id) + '">' +
              '<div class="pkg-days">' + p.kunlar + ' kun</div>' +
              (p.chegirma_foiz ? '<div class="pkg-disc">−' + p.chegirma_foiz + '%</div>' : '<div class="pkg-disc none">chegirmasiz</div>') +
              '<div class="pkg-total">' + som(p.jami) + '</div><div class="small muted">kuniga ' + UI.money(p.kuniga) + '</div>' +
              (p.tejaladi ? '<div class="small save">Tejaysiz: ' + UI.money(p.tejaladi) + '</div>' : '') +
              (p.yangi_keshbek ? '<div class="small">+' + UI.money(p.yangi_keshbek) + ' keshbek</div>' : '') + '</button>';
          }).join('') + '</div>' +
          '<h3 class="sec">3. Boshlanish sanasi</h3><div class="chips scroll">' + workDays.map(function (d) {
            return '<button class="chip-btn date ' + (d.sana === st.boshlanish ? 'on' : '') + '" data-click="date" data-id="' + d.sana + '">' +
              '<span class="small">' + UI.wd(d.sana) + '</span><br>' + UI.dateShort(d.sana) + '</button>';
          }).join('') + '</div><p class="hint">Kesish vaqti ' + esc(f.kesish_vaqti) + ': undan keyin ertangi kunga buyurtma qabul qilinmaydi. Yakshanba dam olish kuni.</p>' +
          '<h3 class="sec">4. Manzil</h3><div class="list">' + f.manzillar.map(function (a) {
            return '<label class="list-item"><input type="radio" name="addr" value="' + esc(a.id) + '" data-change="addr"' + (a.id === st.manzil_id ? ' checked' : '') + '>' +
              '<div class="grow"><b>' + esc(a.nom) + '</b> · <span class="muted">' + esc(a.hudud) + '</span><div class="small">' + esc(a.matn) + '</div></div></label>';
          }).join('') + '</div><button class="btn ghost small mt" data-click="newAddr">+ Yangi manzil</button>' +
          (f.keshbek_balans > 0 ? '<h3 class="sec">5. Keshbek</h3><label class="switch-row"><span>Keshbekdan ishlatish <span class="muted">(balans ' + som(f.keshbek_balans) + ')</span></span>' +
            '<input type="checkbox" class="switch" data-change="cb"' + (st.use_cashback ? ' checked' : '') + '></label>' : '') +
          '<div class="summary" id="summary"><div class="spinner small"></div></div>' +
          '<button class="btn block big-btn" data-click="submit" id="submitBtn">Buyurtma berish</button>';
        UI.view(html, actions);
        quote();
      };
      var lastQ = 0;
      var quote = function () {
        var my = ++lastQ;
        var box = document.getElementById('summary');
        return api('quote', st, { silent: true }).then(function (q) {
          if (my !== lastQ || !box) return;
          box.innerHTML =
            '<div class="row between"><span>' + q.kunlar + ' kun × ' + UI.money(q.kunlik_narx) + '</span><span>' + UI.money(q.bez_chegirma) + '</span></div>' +
            (q.tejaladi ? '<div class="row between save"><span>Chegirma ' + q.chegirma_foiz + '%</span><span>−' + UI.money(q.tejaladi) + '</span></div>' : '') +
            (q.keshbek_ishlatildi ? '<div class="row between save"><span>Keshbekdan</span><span>−' + UI.money(q.keshbek_ishlatildi) + '</span></div>' : '') +
            '<div class="row between total"><span>To\'lanadi</span><span>' + som(q.tolanadi) + '</span></div>' +
            '<div class="small muted">' + UI.date(q.boshlanish) + ' — ' + UI.date(q.tugash) + ' · ' + (q.yangi_keshbek ? 'To\'lovdan keyin +' + UI.money(q.yangi_keshbek) + ' keshbek' : '') + '</div>';
        }).catch(function (e) { if (box) box.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
      };
      var actions = {
        ration: function (el) {
          st.ratsion_id = el.dataset.id;
          var pk = ration().paketlar;
          if (!pk.some(function (p) { return p.paket_id === st.paket_id; })) st.paket_id = (pk[0] || {}).paket_id;
          render();
        },
        pkg: function (el) { st.paket_id = el.dataset.id; render(); },
        date: function (el) { st.boshlanish = el.dataset.id; render(); },
        addr: function (el) { st.manzil_id = el.value; },
        cb: function (el) { st.use_cashback = el.checked; quote(); },
        newAddr: function () {
          var s = UI.sheet('Yangi manzil', '<div id="naddr"></div>', {}, { wide: true });
          AddrForm.form(s.el.querySelector('#naddr'), {
            addr: { nom: '' }, hududlar: f.hududlar, telegramLocation: true,
            onSubmit: function (d) {
              return api('addressSave', d).then(function (res) {
                f.manzillar = res.items;
                st.manzil_id = res.items[res.items.length - 1].id;
                s.close();
                render();
              });
            }
          });
        },
        submit: function (el) {
          if (!st.manzil_id) return UI.toast('Manzilni tanlang yoki qo\'shing', 'err');
          el.disabled = true;
          return api('createOrder', st).then(function (o) {
            UI.haptic('success');
            UI.go(o.holat === 'faol' ? 'orders/' + o.id : 'pay/' + o.id);
          }).finally(function () { el.disabled = false; });
        }
      };
      render();
    });
  }

  // ---------- To'lov ----------
  function payPage(params) {
    return Promise.all([api('orderDetail', { id: params.id }), api('home')]).then(function (res) {
      var o = res[0], h = res[1];
      if (o.holat !== 'tolov_kutish') { UI.go('orders/' + o.id); return; }
      var pending = o.tolovlar.filter(function (p) { return p.holat === 'kutilmoqda'; });
      var due = o.tolanadi - o.tolangan;
      var html = '<h1>To\'lov</h1><div class="card center"><div class="muted">To\'lanadigan summa</div><div class="huge">' + som(due) + '</div>' +
        '<div class="small muted">' + esc(o.ratsion) + ', ' + o.kunlar + ' kun · narx ' + UI.dt(o.narx_muddati) + ' gacha kafolatlangan</div></div>';
      if (pending.length) {
        html += '<div class="card ok"><b>🧾 ' + (pending[0].usul === 'naqd' ? 'Naqd to\'lov qayd etildi' : 'Chek yuborildi') + '</b>' +
          '<p>Admin tasdiqlagach buyurtma faol bo\'ladi va Telegram orqali xabar olasiz.</p></div>';
      } else {
        html += '<div class="card"><h3>1. Kartaga o\'tkazing</h3>' +
          (h.karta.raqam ? '<div class="cardnum" data-click="copy">' + esc(h.karta.raqam) + ' <span class="small">📋</span></div><div class="muted small">' + esc(h.karta.egasi) + '</div>' :
            '<p class="muted">Karta raqami hali kiritilmagan. Admin bilan bog\'laning.</p>') +
          '<h3 class="mt">2. Chek rasmini yuboring</h3>' +
          '<label class="btn block upload">📷 Chek rasmini tanlash<input type="file" accept="image/*" data-change="receipt" hidden></label>' +
          '<p class="hint">Yoki chek rasmini bot chatiga yuboring.</p></div>' +
          '<button class="btn ghost block" data-click="cash">💵 Naqd to\'layman</button>';
        rejected(o).forEach(function (p) {
          html += '<div class="card warn small">Oldingi chek rad etildi: ' + esc(p.izoh) + '</div>';
        });
      }
      html += '<button class="btn link-btn block mt" data-click="cancel">Buyurtmani bekor qilish</button>';
      UI.view(html, {
        copy: function () { UI.copyText(h.karta.raqam.replace(/\s/g, '')); },
        receipt: function (el) {
          var file = el.files && el.files[0];
          if (!file) return;
          return UI.compressImage(file).then(function (data) {
            return api('submitPayment', { buyurtma_id: o.id, usul: 'karta', chek: data });
          }).then(function () { UI.toast('Chek yuborildi'); UI.haptic('success'); UI.reload(); });
        },
        cash: function () {
          return UI.confirm('Naqd pulni kuryerga emas, ofisga yoki adminga topshirasiz. Davom etamizmi?', 'Ha, naqd').then(function (y) {
            if (!y) return;
            return api('submitPayment', { buyurtma_id: o.id, usul: 'naqd' }).then(function () { UI.reload(); });
          });
        },
        cancel: function () {
          return UI.confirm('Buyurtmani bekor qilasizmi?', 'Bekor qilish', true).then(function (y) {
            if (!y) return;
            return api('cancelMyOrder', { buyurtma_id: o.id }).then(function () { UI.toast('Bekor qilindi'); UI.go(''); });
          });
        }
      });
    });
  }
  function rejected(o) { return o.tolovlar.filter(function (p) { return p.holat === 'rad_etildi'; }).slice(-1); }

  // ---------- 4. Chegirmalar ----------
  function discounts() {
    return api('discounts').then(function (c) {
      var html = '<h1>Chegirmalar</h1><p class="muted">Uzoqroq paket — kuniga arzonroq va ko\'proq keshbek. Keshbek: to\'langan summaning ' +
        c.keshbek.foiz + '%, ' + c.keshbek.amal_muddati_kun + ' kun amal qiladi.</p>';
      c.ratsionlar.forEach(function (r) {
        html += '<div class="card"><h3>' + esc(r.nom) + (r.kaloriya ? ' <span class="muted small">' + esc(r.kaloriya) + ' kkal</span>' : '') + '</h3>' +
          (r.tavsif ? '<div class="menu-text small muted mb">' + esc(r.tavsif) + '</div>' : '') +
          '<div class="table-wrap"><table class="tbl"><thead><tr><th>Paket</th><th>Jami</th><th>Kuniga</th><th>Tejaysiz</th><th>Keshbek</th></tr></thead><tbody>' +
          r.paketlar.map(function (p) {
            return '<tr><td><b>' + p.kunlar + ' kun</b>' + (p.chegirma_foiz ? ' <span class="badge st-faol">−' + p.chegirma_foiz + '%</span>' : '') + '</td>' +
              '<td>' + UI.money(p.jami) + '</td><td>' + UI.money(p.kuniga) + '</td><td class="save">' + (p.tejaladi ? UI.money(p.tejaladi) : '—') + '</td>' +
              '<td>' + UI.money(p.yangi_keshbek) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<a class="btn block mt" href="#/order?ratsion=' + esc(r.id) + '">Tanlash</a></div>';
      });
      UI.view(html);
    });
  }

  // ---------- 5. Keshbek ----------
  function cashback() {
    return api('cashback').then(function (c) {
      var html = '<h1>Keshbek</h1><div class="card center"><div class="muted">Balans</div><div class="huge">' + som(c.balans) + '</div>' +
        (c.keyingi_tugash ? '<div class="small muted">' + som(c.keyingi_tugash.summa) + ' — ' + UI.date(c.keyingi_tugash.tugash_sana) + ' gacha amal qiladi</div>' : '') + '</div>';
      if (c.tugayotgan.length) {
        html += '<div class="card warn"><b>⏳ Muddati tugayapti</b>' + c.tugayotgan.map(function (t) {
          return '<div>' + som(t.summa) + ' — ' + UI.date(t.tugash_sana) + '</div>';
        }).join('') + '<a class="btn block mt" href="#/order">Buyurtmada ishlatish</a></div>';
      }
      html += '<h3 class="sec">Tarix</h3>' + (c.tarix.length ? '<div class="list">' + c.tarix.map(function (e) {
        return '<div class="list-item"><div class="grow"><b>' + esc(e.tur_nomi) + '</b><div class="small muted">' + UI.date(e.sana) +
          (e.tugash_sana && e.summa > 0 ? ' · ' + UI.date(e.tugash_sana) + ' gacha' : '') + (e.izoh && e.tur === 'tuzatish' ? ' · ' + esc(e.izoh) : '') + '</div></div>' +
          '<b class="' + (e.summa > 0 ? 'save' : 'neg') + '">' + (e.summa > 0 ? '+' : '') + UI.money(e.summa) + '</b></div>';
      }).join('') + '</div>' : UI.empty('💰', 'Hali keshbek yo\'q. Birinchi to\'lovdan keyin hisoblanadi.'));
      UI.view(html);
    });
  }

  // ---------- 6. Buyurtmalarim ----------
  function orders() {
    return api('myOrders').then(function (list) {
      if (!list.length) return UI.view('<h1>Buyurtmalarim</h1>' + UI.empty('📦', 'Hali buyurtma yo\'q', '<a class="btn" href="#/order">Buyurtma berish</a>'));
      UI.view('<h1>Buyurtmalarim</h1><div class="list">' + list.map(function (o) {
        return '<a class="list-item link" href="#/' + (o.holat === 'tolov_kutish' ? 'pay/' : 'orders/') + esc(o.id) + '"><div class="grow">' +
          '<div class="row between"><b>' + esc(o.ratsion) + ', ' + o.kunlar + ' kun</b>' + UI.statusBadge(o.holat, o.holat_nomi) + '</div>' +
          '<div class="small muted">' + UI.date(o.boshlanish) + ' — ' + UI.date(o.tugash) + ' · ' + som(o.tolanadi) + '</div>' +
          (o.holat === 'faol' ? UI.progress((o.kunlar - o.qolgan_kun) / o.kunlar * 100) : '') + '</div></a>';
      }).join('') + '</div>');
    });
  }

  function orderDetail(params) {
    return api('orderDetail', { id: params.id }).then(function (o) {
      renderOrder(o);
    });
  }

  function renderOrder(o) {
    var html = '<a class="back" href="#/orders">‹ Buyurtmalarim</a><div class="row between"><h1>' + esc(o.ratsion) + '</h1>' + UI.statusBadge(o.holat, o.holat_nomi) + '</div>' +
      '<div class="card"><div class="grid2">' +
      '<div><div class="muted small">Paket</div><b>' + o.kunlar + ' kun</b></div>' +
      '<div><div class="muted small">Qolgan</div><b>' + o.qolgan_kun + ' kun</b></div>' +
      '<div><div class="muted small">Boshlanish</div><b>' + UI.date(o.boshlanish) + '</b></div>' +
      '<div><div class="muted small">Tugash</div><b>' + UI.date(o.tugash) + '</b></div>' +
      '<div><div class="muted small">To\'langan</div><b>' + som(o.tolangan) + '</b></div>' +
      '<div><div class="muted small">To\'lov</div>' + UI.statusBadge(o.tolov_holati, o.tolov_holati_nomi) + '</div></div>' +
      '<div class="small mt">📍 ' + esc(o.manzil.nom || '') + ' — ' + esc(o.manzil.matn || '') +
      (o.holat === 'faol' || o.holat === 'tolov_kutish' ? ' <a href="#" data-click="addr">o\'zgartirish</a>' : '') + '</div></div>';
    if (o.holat === 'faol') {
      html += '<h3 class="sec">Kunlar</h3><p class="hint">Kunni bosib pauza qiling (' + o.pauza + '/' + o.pauza_limit + ' ishlatilgan). Pauza kuni paket oxiriga suriladi. ' +
        'Ertangi kunni faqat kesish vaqtigacha o\'zgartirish mumkin.</p>';
    }
    if (o.kunlar_jadvali.length) {
      html += UI.calendar(o.kunlar_jadvali, {
        action: 'day', clickable: function (d) { return d.pauza_mumkin || d.pauza_bekor_mumkin; }
      });
    }
    if (o.holat === 'tolov_kutish') html += '<a class="btn block mt" href="#/pay/' + esc(o.id) + '">To\'lov</a>';
    if (o.holat === 'tugadi' || o.holat === 'bekor') html += '<a class="btn block mt" href="#/order?ratsion=' + esc(o.ratsion_id) + '">🔁 Yana buyurtma berish</a>';
    UI.view(html, {
      day: function (el) {
        var d = o.kunlar_jadvali.filter(function (x) { return x.id === el.dataset.id; })[0];
        if (!d) return;
        var pause = d.holat === 'rejada';
        return UI.confirm(pause ? UI.date(d.sana, true) + ' kunini pauza qilasizmi? Paket oxiri 1 kunga suriladi.' :
          UI.date(d.sana, true) + ' pauzasini bekor qilasizmi?', pause ? 'Pauza' : 'Bekor qilish').then(function (y) {
          if (!y) return;
          return api(pause ? 'pauseDay' : 'unpauseDay', { buyurtma_id: o.id, yetkazish_id: d.id }).then(function (no) {
            UI.toast(pause ? 'Pauza qilindi. Yangi tugash: ' + UI.date(no.tugash) : 'Pauza bekor qilindi');
            renderOrder(no);
          });
        });
      },
      addr: function () {
        return api('addresses').then(function (a) {
          var s = UI.sheet('Manzilni tanlang', '<div class="list">' + a.items.map(function (x) {
            return '<button class="list-item link" data-click="pick" data-id="' + esc(x.id) + '"><div class="grow"><b>' + esc(x.nom) + '</b><div class="small">' + esc(x.matn) + '</div></div></button>';
          }).join('') + '</div><a class="btn ghost block mt" href="#/addresses/new">+ Yangi manzil</a>', {
            pick: function (el) {
              return api('changeOrderAddress', { buyurtma_id: o.id, manzil_id: el.dataset.id }).then(function (no) {
                s.close(); UI.toast('Manzil yangilandi (keyingi kunlar uchun)'); renderOrder(no);
              });
            }
          });
        });
      }
    });
  }

  // ---------- 7. Manzillarim ----------
  function addresses() {
    return api('addresses').then(function (d) {
      UI.view('<h1>Manzillarim</h1>' + (d.items.length ? '<div class="list">' + d.items.map(function (a) {
        return '<a class="list-item link" href="#/addresses/' + esc(a.id) + '"><span class="li-ico">' + (a.lat !== '' ? '📍' : '🏠') + '</span><div class="grow"><b>' + esc(a.nom) + '</b> · <span class="muted">' + esc(a.hudud) + '</span>' +
          '<div class="small">' + esc(a.matn) + (a.moljal ? ' (' + esc(a.moljal) + ')' : '') + '</div></div><span class="muted">›</span></a>';
      }).join('') + '</div>' : UI.empty('🏠', 'Manzil yo\'q')) + '<a class="btn block mt" href="#/addresses/new">+ Manzil qo\'shish</a>');
    });
  }

  function addressEdit(params) {
    return api('addresses').then(function (d) {
      var a = params.id === 'new' ? { nom: '' } : d.items.filter(function (x) { return x.id === params.id; })[0];
      if (!a) return UI.go('addresses');
      UI.view('<a class="back" href="#/addresses">‹ Manzillarim</a><h1>' + (a.id ? 'Manzilni tahrirlash' : 'Yangi manzil') + '</h1><div id="af"></div>' +
        (a.id ? '<button class="btn link-btn block mt danger-text" data-click="del">Manzilni o\'chirish</button>' : ''), {
        del: function () {
          return UI.confirm('Manzil o\'chirilsinmi?', 'O\'chirish', true).then(function (y) {
            if (y) return api('addressRemove', { id: a.id }).then(function () { UI.go('addresses'); });
          });
        }
      });
      AddrForm.form(document.getElementById('af'), {
        addr: a, hududlar: d.hududlar, telegramLocation: true,
        onSubmit: function (data) {
          return api('addressSave', data).then(function () { UI.toast('Saqlandi'); history.back(); });
        }
      });
    });
  }

  // ---------- Oylik katalog ----------
  function catalogPage() {
    return api('catalog').then(function (c) {
      if (!c.rasmlar.length) return UI.view('<h1>Katalog</h1>' + UI.empty('📚', 'Katalog hali joylanmagan'));
      UI.view('<h1>📚 Katalog</h1>' + (c.yangilangan ? '<p class="small muted">Yangilangan: ' + UI.date(c.yangilangan) + '</p>' : '') +
        c.rasmlar.map(function (x) {
          return '<a class="catalog-img" href="#" data-click="open" data-url="' + esc(x.url) + '"><img loading="lazy" src="' + esc(x.url) + '" alt="' + esc(x.nom || 'Katalog') + '"></a>';
        }).join('') + '<a class="btn block mt" href="#/order">🛒 Buyurtma berish</a>', {
        open: function (el) { UI.openLink(el.dataset.url); }
      });
    });
  }

  // ---------- 8. Profil ----------
  function profile() {
    return api('profile').then(function (p) {
      UI.view('<h1>Profil</h1><form class="card stack" data-submit="save">' +
        UI.field('Ism', '<input name="ism" value="' + esc(p.ism) + '" maxlength="80" required>') +
        UI.field('Telefon', '<input value="' + esc(p.telefon) + '" disabled>', 'Raqam bir marta kiritiladi. O\'zgartirish admin orqali.') +
        UI.field('Til', '<select name="til"><option value="uz" selected>O\'zbekcha (lotin)</option><option value="ru" disabled>Русский (tez orada)</option></select>') +
        '<button class="btn block">Saqlash</button></form>' +
        (p.telefon_sorov ? '<div class="card warn small">Telefon o\'zgartirish so\'rovi yuborilgan: ' + esc(p.telefon_sorov) + '</div>' :
          '<button class="btn ghost block" data-click="phone">📞 Telefon raqamni o\'zgartirish so\'rovi</button>') +
        '<p class="small muted center mt">Ro\'yxatdan o\'tgan: ' + UI.date(p.royxatdan_sana) + '</p>', {
        save: function (form) {
          return api('profileUpdate', UI.formData(form)).then(function () { UI.toast('Saqlandi'); });
        },
        phone: function () {
          var s = UI.sheet('Yangi raqam', '<form data-submit="send" class="stack">' +
            UI.field('Yangi telefon', '<input name="telefon" type="tel" placeholder="+998 90 123 45 67" required>') +
            '<button class="btn block">So\'rov yuborish</button></form>', {
            send: function (form) {
              return api('requestPhoneChange', UI.formData(form)).then(function () { s.close(); UI.toast('So\'rov yuborildi'); UI.reload(); });
            }
          });
        }
      });
    });
  }

  function start(me) {
    if (!me.royxatdan_otgan) { registration(me); return; }
    UI.setNav([
      { path: '', icon: '🏠', label: 'Bosh sahifa' },
      { path: 'order', icon: '🛒', label: 'Buyurtma' },
      { path: 'orders', icon: '📦', label: 'Buyurtmalarim' },
      { path: 'cashback', icon: '💰', label: 'Keshbek' },
      { path: 'catalog', icon: '📚', label: 'Katalog', more: true },
      { path: 'discounts', icon: '🏷', label: 'Chegirmalar', more: true },
      { path: 'addresses', icon: '📍', label: 'Manzillarim', more: true },
      { path: 'profile', icon: '👤', label: 'Profil', more: true }
    ]);
    UI.route('', home);
    UI.route('order', orderPage);
    UI.route('pay/:id', payPage);
    UI.route('discounts', discounts);
    UI.route('catalog', catalogPage);
    UI.route('cashback', cashback);
    UI.route('orders', orders);
    UI.route('orders/:id', orderDetail);
    UI.route('addresses', addresses);
    UI.route('addresses/:id', addressEdit);
    UI.route('profile', profile);
    UI.start();
  }

  window.ClientApp = { start: start };
})();
