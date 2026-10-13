/* Admin panel, 2-qism (faqat sheriklar): Narx va paketlar, Xarajat, Oyliklar, Dashboard, Foydalanuvchilar, Sozlamalar, Audit. */
(function () {
  'use strict';
  var esc = UI.esc, som = UI.som, money = UI.money, api = UI.api;
  var A = window.AdminApp = window.AdminApp || {};

  /** Marja qo'riqchisi: server ogohlantirsa qizil oynada ko'rsatib, ongli tasdiq so'raydi. */
  function withMarginGuard(action, payload) {
    return api(action, payload).catch(function (e) {
      if (e.code !== 'marja') throw e;
      return new Promise(function (resolve, reject) {
        var done = false;
        var s = UI.sheet('⚠️ Marja qo\'riqchisi', '<div class="card danger-card"><b>Chegirma va keshbekdan keyingi narx tannarxdan past!</b><ul>' +
          e.data.ogohlantirishlar.map(function (w) { return '<li>' + esc(w.matn) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="row gap"><button class="btn ghost grow" data-click="no">Bekor qilish</button>' +
          '<button class="btn danger grow" data-click="yes">Baribir saqlash</button></div>', {
          no: function () { s.close(); },
          yes: function () { done = true; s.close(); resolve(api(action, Object.assign({}, payload, { tasdiq: true }))); }
        }, { onClose: function () { if (!done) reject(new UI.ApiError('Saqlanmadi', 'bekor')); } });
      });
    });
  }

  // ---------- Narx va paketlar, keshbek qoidasi ----------
  function pricing() {
    return api('pricing').then(function (d) {
      var html = '<h1>Narx va paketlar</h1>' +
        '<p class="hint">Har o\'zgarish yangi qator sifatida "qachondan" sanasi bilan saqlanadi. Eski buyurtmalar o\'zgarmaydi.</p>';
      if (d.ogohlantirishlar.length) {
        html += '<div class="card danger-card"><b>🔴 Hozirgi narxlar bo\'yicha zarar:</b><ul>' + d.ogohlantirishlar.map(function (w) { return '<li>' + esc(w.matn) + '</li>'; }).join('') + '</ul></div>';
      }
      html += '<div class="card"><div class="row between"><h3>Ratsionlar</h3><button class="btn small" data-click="ration">+ Ratsion</button></div>' +
        d.ratsionlar.map(function (r, i) {
          return '<div class="sub-card"><div class="row between wrap"><div><b>' + esc(r.nom) + '</b> ' + (r.faol ? '' : '<span class="badge">nofaol</span>') +
            '<div class="small muted">' + (r.kaloriya || '—') + ' kkal · tannarx ' + money(r.tannarx) + ' (ovqat ' + money(r.tannarx_ovqat) + ' + qadoq/yetkazish ' + money(r.tannarx_qadoq_yetkazish) + ')</div></div>' +
            '<div class="right"><div class="big">' + money(r.joriy_narx) + '</div><div class="small muted">so\'m/kun</div></div></div>' +
            '<div class="row gap mt"><button class="btn small" data-click="price" data-i="' + i + '">Yangi narx</button><button class="btn small ghost" data-click="ration" data-i="' + i + '">Tahrirlash</button></div>' +
            (r.tarix.length ? '<details class="mt"><summary class="small">Narx tarixi (' + r.tarix.length + ')</summary><table class="tbl small">' + r.tarix.map(function (n) {
              return '<tr><td>' + UI.date(n.qachondan) + ' dan</td><td class="right">' + money(n.kunlik_narx) + '</td><td class="muted">' + UI.dt(n.yaratilgan) + '</td></tr>';
            }).join('') + '</table></details>' : '') + '</div>';
        }).join('') + '</div>';
      html += '<div class="card"><div class="row between"><h3>Paketlar</h3><button class="btn small" data-click="pkg">+ Paket / yangi chegirma</button></div>' +
        '<table class="tbl"><thead><tr><th>Kun</th><th>Chegirma</th><th>Qachondan</th><th></th></tr></thead><tbody>' + d.paketlar_joriy.map(function (p, i) {
          return '<tr><td><b>' + p.kunlar + '</b> ' + esc(p.nom) + '</td><td>' + p.chegirma_foiz + '%</td><td>' + UI.date(p.qachondan) + '</td>' +
            '<td class="right"><button class="btn small ghost" data-click="pkg" data-i="' + i + '">O\'zgartirish</button></td></tr>';
        }).join('') + '</tbody></table>' +
        '<details class="mt"><summary class="small">Paketlar tarixi</summary><table class="tbl small">' + d.paketlar_tarix.map(function (p) {
          return '<tr><td>' + p.kunlar + ' kun</td><td>' + p.chegirma_foiz + '%</td><td>' + UI.date(p.qachondan) + ' dan</td><td>' + (p.faol ? 'faol' : 'sotuvdan olingan') + '</td></tr>';
        }).join('') + '</table></details></div>';
      var k = d.keshbek_joriy;
      html += '<div class="card"><div class="row between"><h3>Keshbek qoidasi</h3><button class="btn small" data-click="cb">Yangi qoida</button></div>' +
        '<div class="grid2"><div><div class="muted small">Foiz</div><b>' + k.foiz + '%</b></div><div><div class="muted small">Amal muddati</div><b>' + k.amal_muddati_kun + ' kun</b></div>' +
        '<div><div class="muted small">Bitta buyurtmada chegara</div><b>Jami ning ' + k.max_ulush_foiz + '%</b></div><div><div class="muted small">Minimal summa</div><b>' + money(k.min_summa) + '</b></div></div>' +
        '<details class="mt"><summary class="small">Tarix</summary><table class="tbl small">' + d.keshbek_tarix.map(function (r) {
          return '<tr><td>' + UI.date(r.qachondan) + ' dan</td><td>' + r.foiz + '%</td><td>' + r.amal_muddati_kun + ' kun</td><td>' + r.max_ulush_foiz + '%</td></tr>';
        }).join('') + '</table></details></div>';

      var today = UI.today();
      UI.view(html, {
        ration: function (el) {
          var r = el.dataset.i !== undefined ? d.ratsionlar[+el.dataset.i] : { faol: true };
          var s = UI.sheet(r.id ? 'Ratsionni tahrirlash' : 'Yangi ratsion', '<form class="stack" data-submit="save">' +
            UI.field('Nomi', '<input name="nom" required value="' + esc(r.nom || '') + '">') +
            UI.field('Kaloriya', '<input name="kaloriya" type="number" min="0" value="' + esc(r.kaloriya || '') + '">') +
            UI.field('Tavsif', '<input name="tavsif" value="' + esc(r.tavsif || '') + '">') +
            UI.field('Ovqat tannarxi (so\'m/kun)', '<input name="tannarx_ovqat" type="number" min="0" required value="' + esc(r.tannarx_ovqat || 0) + '">') +
            UI.field('Qadoq va yetkazish tannarxi (so\'m/kun)', '<input name="tannarx_qadoq_yetkazish" type="number" min="0" required value="' + esc(r.tannarx_qadoq_yetkazish || 0) + '">') +
            '<label class="chk"><input type="checkbox" name="faol"' + (r.faol ? ' checked' : '') + '> Sotuvda</label>' +
            (!r.id ? UI.field('Boshlang\'ich kunlik narx', '<input name="narx" type="number" min="1" required>') : '') +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form);
              f.id = r.id;
              ['kaloriya', 'tannarx_ovqat', 'tannarx_qadoq_yetkazish'].forEach(function (k2) { f[k2] = Number(f[k2] || 0); });
              return withMarginGuard('rationSave', f).then(function (saved) {
                if (!r.id && f.narx) return withMarginGuard('priceAdd', { ratsion_id: saved.id, kunlik_narx: Number(f.narx), qachondan: today });
              }).then(function () { s.close(); UI.toast('Saqlandi'); UI.reload(); });
            }
          });
        },
        price: function (el) {
          var r = d.ratsionlar[+el.dataset.i];
          var s = UI.sheet('Yangi narx: ' + r.nom, '<form class="stack" data-submit="save">' +
            UI.field('Kunlik narx', '<input name="kunlik_narx" type="number" min="1" required value="' + r.joriy_narx + '">', 'Tannarx: ' + money(r.tannarx)) +
            UI.field('Qachondan', '<input name="qachondan" type="date" min="' + today + '" value="' + today + '" required>') +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form);
              return withMarginGuard('priceAdd', { ratsion_id: r.id, kunlik_narx: Number(f.kunlik_narx), qachondan: f.qachondan }).then(function () { s.close(); UI.reload(); });
            }
          });
        },
        pkg: function (el) {
          var p = el.dataset.i !== undefined ? d.paketlar_joriy[+el.dataset.i] : {};
          var s = UI.sheet(p.kunlar ? p.kunlar + ' kunlik paket' : 'Yangi paket', '<form class="stack" data-submit="save">' +
            UI.field('Kunlar', '<input name="kunlar" type="number" min="1" max="120" required value="' + esc(p.kunlar || '') + '"' + (p.kunlar ? ' readonly' : '') + '>') +
            UI.field('Nomi', '<input name="nom" value="' + esc(p.nom || '') + '">') +
            UI.field('Chegirma, %', '<input name="chegirma_foiz" type="number" min="0" max="99" step="0.5" value="' + esc(p.chegirma_foiz || 0) + '">') +
            UI.field('Qachondan', '<input name="qachondan" type="date" min="' + today + '" value="' + today + '" required>') +
            (p.kunlar ? '<label class="chk"><input type="checkbox" name="sotuvdan"> Shu sanadan sotuvdan olish</label>' : '') +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form);
              return withMarginGuard('packageAdd', { kunlar: Number(f.kunlar), nom: f.nom, chegirma_foiz: Number(f.chegirma_foiz), qachondan: f.qachondan, faol: !f.sotuvdan })
                .then(function () { s.close(); UI.reload(); });
            }
          });
        },
        cb: function () {
          var s = UI.sheet('Keshbek qoidasi', '<form class="stack" data-submit="save">' +
            UI.field('Foiz, %', '<input name="foiz" type="number" step="0.5" min="0" max="99" value="' + k.foiz + '" required>') +
            UI.field('Amal muddati, kun', '<input name="amal_muddati_kun" type="number" min="1" value="' + k.amal_muddati_kun + '" required>') +
            UI.field('Bitta buyurtmada keshbek bilan to\'lash chegarasi (Jami %)', '<input name="max_ulush_foiz" type="number" min="0" max="99" value="' + k.max_ulush_foiz + '">') +
            UI.field('Keshbek beriladigan minimal summa', '<input name="min_summa" type="number" min="0" value="' + k.min_summa + '">') +
            UI.field('Qachondan', '<input name="qachondan" type="date" min="' + today + '" value="' + today + '" required>') +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form);
              ['foiz', 'amal_muddati_kun', 'max_ulush_foiz', 'min_summa'].forEach(function (x) { f[x] = Number(f[x] || 0); });
              return withMarginGuard('cashbackRuleAdd', f).then(function () { s.close(); UI.reload(); });
            }
          });
        }
      });
    });
  }

  // ---------- Xarajat (9-bo'lim) ----------
  function expenses(params, q) {
    var from = q.dan || UI.today().slice(0, 8) + '01';
    var to = q.gacha || UI.today();
    return api('expenses', { dan: from, gacha: to, turkum_id: q.turkum_id || '' }).then(function (d) {
      var cats = d.turkumlar.filter(function (c) { return c.faol; });
      var st = { turkum_id: (cats[0] || {}).id };
      var catById = {};
      d.turkumlar.forEach(function (c) { catById[c.id] = c; });
      var html = '<h1>Xarajat</h1>' +
        '<form class="card stack quick" data-submit="add" id="qf">' +
        '<input class="huge-input" name="summa" type="number" inputmode="numeric" min="1" placeholder="Summa" required autofocus>' +
        '<div class="chips" id="catChips">' + cats.map(function (c) {
          return '<button type="button" class="chip-btn ' + (c.id === st.turkum_id ? 'on' : '') + '" data-click="cat" data-id="' + esc(c.id) + '">' + esc(c.nom) + '</button>';
        }).join('') + '</div>' +
        '<div id="extra"></div>' +
        '<div class="row gap wrap"><input type="date" name="sana" value="' + UI.today() + '"><input name="izoh" placeholder="Izoh" class="grow">' +
        '<label class="btn small ghost upload">📷 Chek<input type="file" accept="image/*" name="chekfile" hidden data-change="file"></label></div>' +
        '<button class="btn block">Saqlash</button><div class="hint" id="fileHint"></div></form>';
      if (d.tasdiq_kutilmoqda.length) {
        html += '<div class="card warn"><h3>⚠️ Ikkinchi sherik tasdig\'i kerak</h3>' + d.tasdiq_kutilmoqda.map(function (x) {
          var mine = String(x.kim_kiritdi).split(':')[0] === A.me.user_id;
          return '<div class="list-item wrap"><div class="grow"><b>' + som(x.summa) + '</b> · ' + esc(x.turkum) + ' · ' + UI.date(x.sana) +
            '<div class="small muted">' + esc(x.izoh) + ' · kiritdi: ' + esc(String(x.kim_kiritdi).split(':')[1] || '') + '</div></div>' +
            (mine ? '<span class="small muted">boshqa sherik tasdiqlaydi</span>' : '<button class="btn small ok-btn" data-click="approve" data-id="' + esc(x.id) + '">Tasdiqlash</button>' +
              '<button class="btn small danger" data-click="rejectX" data-id="' + esc(x.id) + '">Rad</button>') + '</div>';
        }).join('') + '</div>';
      }
      if (d.oxirgi_xarajat && UI.addDays(d.oxirgi_xarajat, 3) <= UI.today()) {
        html += '<div class="card warn small">Oxirgi xarajat ' + UI.date(d.oxirgi_xarajat) + ' da kiritilgan — dashboard to\'liq bo\'lmasligi mumkin.</div>';
      }
      html += '<div class="card"><form class="filters" data-submit="filter"><input type="date" name="dan" value="' + from + '"><input type="date" name="gacha" value="' + to + '">' +
        '<select name="turkum_id">' + UI.options(d.turkumlar.map(function (c) { return { value: c.id, label: c.nom }; }), q.turkum_id, { empty: 'Barcha turkum' }) + '</select>' +
        '<button class="btn small">Ko\'rsatish</button></form>' +
        '<div class="row between"><h3>Jami: ' + som(d.jami) + '</h3><button class="btn small ghost" data-click="cats">Turkumlar</button></div>' +
        (d.items.length ? '<div class="table-wrap"><table class="tbl hover"><thead><tr><th>Sana</th><th>Turkum</th><th class="right">Summa</th><th>Izoh</th><th></th></tr></thead><tbody>' +
          d.items.map(function (x) {
            return '<tr data-click="edit" data-id="' + esc(x.id) + '"><td class="nowrap">' + UI.dateShort(x.sana) + '</td><td>' + esc(x.turkum) +
              (x.holat !== 'tasdiqlandi' ? ' <span class="badge st-kutilmoqda">' + esc(x.holat) + '</span>' : '') + '</td><td class="right nowrap">' + money(x.summa) + '</td>' +
              '<td class="small">' + esc(x.izoh) + (x.manba ? ' · ' + esc(x.manba) : '') + (x.sherik_id ? ' · ' + esc(x.sherik_id) : '') + '</td><td>' + (x.chek ? '🧾' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="muted">Bu davrda xarajat yo\'q</p>') + '</div>';
      var chek = null;
      var renderExtra = function () {
        var c = catById[st.turkum_id] || {};
        var ex = '';
        if (c.kod === 'reklama') ex = UI.field('Reklama manbasi (mijoz jalb qilish narxi uchun)', '<select name="manba">' + UI.options(d.manbalar, '', { empty: '—' }) + '</select>');
        if (c.guruh === 'sherik') ex = UI.field('Qaysi sherik oldi', '<select name="sherik_id" required>' + UI.options(d.sheriklar) + '</select>', 'Xarajat emas — foydadan alohida hisoblanadi');
        if (c.guruh === 'doimiy') ex = UI.field('Qaysi oy uchun', '<input type="month" name="davr_oy" value="' + UI.today().slice(0, 7) + '">', 'Dashboardda oy kunlariga teng bo\'linadi');
        document.getElementById('extra').innerHTML = ex;
      };
      UI.view(html, {
        cat: function (el) {
          st.turkum_id = el.dataset.id;
          document.querySelectorAll('#catChips .chip-btn').forEach(function (b) { b.classList.toggle('on', b.dataset.id === st.turkum_id); });
          renderExtra();
        },
        file: function (el) {
          var f = el.files && el.files[0];
          if (!f) return;
          return UI.compressImage(f).then(function (data) { chek = data; document.getElementById('fileHint').textContent = 'Chek tanlandi ✓'; });
        },
        add: function (form) {
          var f = UI.formData(form);
          f.summa = Number(f.summa);
          f.turkum_id = st.turkum_id;
          if (chek) f.chek = chek;
          return api('expenseAdd', f).then(function (x) {
            UI.haptic('success');
            UI.toast(x.holat === 'tasdiq_kutilmoqda' ? 'Saqlandi — ikkinchi sherik tasdig\'i kutilmoqda' : 'Saqlandi');
            UI.reload();
          });
        },
        filter: function (form) { location.hash = '#/expenses' + A.qs(UI.formData(form)); },
        approve: function (el) { return api('expenseApprove', { id: el.dataset.id }).then(UI.reload); },
        rejectX: function (el) { return api('expenseReject', { id: el.dataset.id }).then(UI.reload); },
        edit: function (el) {
          var x = d.items.filter(function (i) { return i.id === el.dataset.id; })[0];
          if (x.oylik_id) return UI.toast('Oylik yozuvi — Oyliklar bo\'limidan boshqariladi');
          var s = UI.sheet('Xarajatni tahrirlash', '<form class="stack" data-submit="save">' +
            UI.field('Summa', '<input name="summa" type="number" min="1" value="' + x.summa + '" required>') +
            UI.field('Turkum', '<select name="turkum_id">' + UI.options(cats.map(function (c) { return { value: c.id, label: c.nom }; }), x.turkum_id) + '</select>') +
            UI.field('Sana', '<input type="date" name="sana" value="' + x.sana + '">') +
            UI.field('Izoh', '<input name="izoh" value="' + esc(x.izoh) + '">') +
            '<p class="hint">Eski qiymat Auditda saqlanadi.</p>' +
            '<button class="btn block">Saqlash</button>' +
            (x.chek ? '<button type="button" class="btn ghost block" data-click="rc">🧾 Chekni ko\'rish</button>' : '') +
            '<button type="button" class="btn link-btn danger-text block" data-click="del">O\'chirish</button></form>', {
            save: function (form) {
              var f = UI.formData(form); f.id = x.id; f.summa = Number(f.summa);
              return api('expenseUpdate', f).then(function () { s.close(); UI.reload(); });
            },
            rc: function () { return A.showReceipt({ xarajat_id: x.id }); },
            del: function () { return api('expenseRemove', { id: x.id }).then(function () { s.close(); UI.reload(); }); }
          });
        },
        cats: function () { categories(d); }
      });
      renderExtra();
    });
  }

  function categories(d) {
    var groups = { ozgaruvchan: "O'zgaruvchan", doimiy: 'Doimiy', oylik: 'Oylik', sherik: 'Sherik taqsimoti' };
    var s = UI.sheet('Xarajat turkumlari', '<div class="list">' + d.turkumlar.map(function (c, i) {
      return '<button class="list-item link" data-click="e" data-i="' + i + '"><div class="grow"><b>' + esc(c.nom) + '</b>' + (c.faol ? '' : ' <span class="badge">nofaol</span>') +
        '<div class="small muted">' + esc(c.guruh_nomi) + (c.hissa ? ' · bir ratsion tannarxiga kiradi' : '') + '</div></div></button>';
    }).join('') + '</div><button class="btn block mt" data-click="e">+ Turkum</button>', {
      e: function (el) {
        var c = el.dataset.i !== undefined ? d.turkumlar[+el.dataset.i] : { faol: true, guruh: 'ozgaruvchan' };
        s.rebind('<form class="stack" data-submit="save">' + UI.field('Nomi', '<input name="nom" required value="' + esc(c.nom || '') + '">') +
          UI.field('Guruh', '<select name="guruh"' + (c.kod ? ' disabled' : '') + '>' + UI.options(Object.keys(groups).map(function (k) { return { value: k, label: groups[k] }; }), c.guruh) + '</select>') +
          '<label class="chk"><input type="checkbox" name="hissa"' + (c.hissa ? ' checked' : '') + '> Bir ratsionning o\'zgaruvchan tannarxiga kiradi (bozorlik, qadoq, yetkazish)</label>' +
          '<label class="chk"><input type="checkbox" name="faol"' + (c.faol ? ' checked' : '') + '> Faol</label>' +
          '<button class="btn block">Saqlash</button></form>');
        UI.bindActions(s.el, {
          save: function (form) {
            var f = UI.formData(form); f.id = c.id; if (c.kod) f.guruh = c.guruh;
            return api('categorySave', f).then(function () { s.close(); UI.reload(); });
          }
        });
      }
    });
  }

  // ---------- Oyliklar ----------
  function payroll(params, q) {
    var ym = q.oy || UI.today().slice(0, 7);
    return api('payroll', { oy: ym }).then(function (d) {
      var html = '<div class="row between wrap"><h1>Oyliklar</h1><form class="filters" data-change="month"><input type="month" name="oy" value="' + ym + '"></form></div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Xodim</th><th>Tur</th><th class="right">Hisoblangan</th><th class="right">Avans</th><th class="right">To\'langan</th><th class="right">Qolgan</th><th></th></tr></thead><tbody>' +
        d.items.map(function (x, i) {
          return '<tr><td><b>' + esc(x.ism) + '</b><div class="small muted">' + esc(x.lavozim) + '</div></td>' +
            '<td class="small">' + esc(x.oylik_turi_nomi) + '<div class="muted">' + money(x.stavka) +
            (x.oylik_turi === 'kunlik' ? ' × ' + x.ishlagan_kun + ' kun' : '') + (x.oylik_turi === 'yetkazish' ? ' × ' + x.yetkazish_soni + ' yetk.' : '') + '</div></td>' +
            '<td class="right">' + money(x.hisoblangan) + '</td><td class="right">' + money(x.avans) + '</td><td class="right">' + money(x.tolangan) + '</td>' +
            '<td class="right"><b>' + money(x.qolgan) + '</b></td><td class="nowrap">' +
            (x.tolandi ? '<span class="badge st-tolangan">To\'landi</span>' :
              '<button class="btn small ghost" data-click="adv" data-i="' + i + '">Avans</button>' +
              (x.oylik_turi === 'kunlik' ? '<button class="btn small ghost" data-click="days" data-i="' + i + '">Kunlar</button>' : '') +
              '<button class="btn small ok-btn" data-click="pay" data-i="' + i + '">To\'landi</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="hint">Qolgan = hisoblangan − avans − to\'langan. "To\'landi" bosilganda summa Xarajatlarga "Oylik" turkumi bilan o\'zi yoziladi (bir xodim, bir oy — bir marta).</p>' +
        '<div class="card"><div class="row between"><h3>Xodimlar</h3><button class="btn small" data-click="staff">+ Xodim</button></div><div class="list">' +
        d.xodimlar.map(function (x, i) {
          return '<button class="list-item link" data-click="staff" data-i="' + i + '"><div class="grow"><b>' + esc(x.ism) + '</b> · ' + esc(x.lavozim) + (x.faol ? '' : ' <span class="badge">nofaol</span>') +
            '<div class="small muted">' + esc(d.turlar[x.oylik_turi]) + ': ' + money(x.summa) + '</div></div></button>';
        }).join('') + '</div></div>' +
        (d.kuryer_statistika.length ? '<div class="card"><h3>Kuryerlar: oylik yetkazishlar</h3><table class="tbl">' + d.kuryer_statistika.map(function (k) {
          return '<tr><td>' + esc(k.ism) + '</td><td class="right"><b>' + k.soni + '</b></td></tr>';
        }).join('') + '</table></div>' : '');
      UI.view(html, {
        month: function (form) { location.hash = '#/payroll?oy=' + UI.formData(form).oy; },
        adv: function (el) {
          var x = d.items[+el.dataset.i];
          var s = UI.sheet('Avans: ' + x.ism, '<form class="stack" data-submit="go">' + UI.field('Summa', '<input name="summa" type="number" min="1" required>') +
            UI.field('Sana', '<input type="date" name="sana" value="' + UI.today() + '">') + '<button class="btn block">Saqlash</button></form>', {
            go: function (form) {
              var f = UI.formData(form);
              return api('salaryAdvance', { xodim_id: x.xodim_id, oy: ym, summa: Number(f.summa), sana: f.sana }).then(function () { s.close(); UI.reload(); });
            }
          });
        },
        days: function (el) {
          var x = d.items[+el.dataset.i];
          var s = UI.sheet('Ishlagan kunlar: ' + x.ism, '<form class="stack" data-submit="go">' + UI.field('Kunlar', '<input name="k" type="number" min="0" max="31" value="' + x.ishlagan_kun + '">') +
            '<button class="btn block">Saqlash</button></form>', {
            go: function (form) {
              return api('salaryDays', { xodim_id: x.xodim_id, oy: ym, ishlagan_kun: Number(UI.formData(form).k) }).then(function () { s.close(); UI.reload(); });
            }
          });
        },
        pay: function (el) {
          var x = d.items[+el.dataset.i];
          return UI.confirm(x.ism + ': ' + som(x.qolgan) + ' to\'landi deb belgilansinmi? Xarajatlarga yoziladi.', 'To\'landi').then(function (y) {
            if (y) return api('salaryPay', { xodim_id: x.xodim_id, oy: ym }).then(function (r) { UI.toast(r.already ? 'Avval to\'langan' : 'Yozildi'); UI.reload(); });
          });
        },
        staff: function (el) {
          var x = el.dataset.i !== undefined ? d.xodimlar[+el.dataset.i] : { faol: true, oylik_turi: 'qatiy' };
          var s = UI.sheet(x.id ? 'Xodim' : 'Yangi xodim', '<form class="stack" data-submit="save">' +
            UI.field('Ism', '<input name="ism" required value="' + esc(x.ism || '') + '">') +
            UI.field('Lavozim', '<input name="lavozim" required value="' + esc(x.lavozim || '') + '" placeholder="Oshpaz, kuryer...">') +
            UI.field('Oylik turi', '<select name="oylik_turi">' + UI.options(Object.keys(d.turlar).map(function (k) { return { value: k, label: d.turlar[k] }; }), x.oylik_turi) + '</select>') +
            UI.field('Summa / stavka', '<input name="summa" type="number" min="1" required value="' + esc(x.summa || '') + '">') +
            UI.field('Telegram ID (kuryer uchun — yetkazishlar soni shu orqali)', '<input name="tg_id" value="' + esc(x.tg_id || '') + '">') +
            '<label class="chk"><input type="checkbox" name="faol"' + (x.faol ? ' checked' : '') + '> Faol</label>' +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form); f.id = x.id; f.summa = Number(f.summa);
              return api('staffSave', f).then(function () { s.close(); UI.reload(); });
            }
          });
        }
      });
    });
  }

  // ---------- Dashboard (10-bo'lim) ----------
  var charts = [];
  function dashboard(params, q) {
    var p = { davr: q.davr || 'bu_oy', dan: q.dan, gacha: q.gacha };
    return api('dashboard', p).then(function (d) {
      var a = d.asosiy, m = d.mijozlar;
      var periods = [['bugun', 'Bugun'], ['7kun', '7 kun'], ['bu_oy', 'Bu oy'], ['otgan_oy', 'O\'tgan oy']];
      var html = '<h1>Dashboard</h1><div class="row wrap gap"><div class="tabs">' + periods.map(function (x) {
        return '<a href="#/dashboard?davr=' + x[0] + '" class="' + (d.davr === x[0] ? 'on' : '') + '">' + x[1] + '</a>';
      }).join('') + '</div><form class="filters inline" data-submit="custom"><input type="date" name="dan" value="' + d.dan + '"><input type="date" name="gacha" value="' + d.gacha + '"><button class="btn small ghost">O\'zboshimcha</button></form></div>' +
        '<p class="small muted">' + UI.date(d.dan) + ' — ' + UI.date(d.gacha) + '. Foyda yetkazilgan kunlar bo\'yicha hisoblanadi, pul tushishi bo\'yicha emas.</p>';
      d.ogohlantirishlar.forEach(function (w) { html += '<div class="card warn small">⚠️ ' + esc(w.matn) + '</div>'; });
      html += '<div class="kpis">' +
        A.kpi('Yetkazilgan ratsion', a.yetkazilgan, 'o\'rtacha ' + a.ortacha_kunlik + '/kun (' + a.ish_kunlari + ' ish kuni)') +
        A.kpi('Daromad', money(a.daromad), a.daromad_kunlar + ' kun bo\'yicha') +
        A.kpi('Xarajat', money(a.xarajat), 'sherik taqsimotisiz') +
        A.kpi(a.zarar ? 'Zarar' : 'Foyda', money(a.foyda), 'marja ' + UI.pct(a.marja), a.zarar ? 'bad' : 'good') +
        A.kpi('Kassa', money(a.kassa), 'tushum ' + money(a.kassa_tafsilot.tushum)) +
        A.kpi('Oldindan olingan', money(a.oldindan_olingan), 'hali yetkazilmagan majburiyat') +
        A.kpi('Keshbek majburiyati', money(a.keshbek_majburiyati), 'barcha balanslar') +
        A.kpi('Zararsizlik nuqtasi', a.zararsizlik === null ? '—' : a.zararsizlik + '/kun', 'hissa ' + money(a.zararsizlik_tafsilot.hissa) + ', doimiy ' + money(a.zararsizlik_tafsilot.doimiy_oylik)) +
        '</div>' +
        '<div class="grid-2col"><div class="card"><h3>Kunlik yetkazilgan ratsion</h3><div class="chart-box"><canvas id="ch1"></canvas></div></div>' +
        '<div class="card"><h3>Oylik daromad, xarajat, foyda</h3><div class="chart-box"><canvas id="ch2"></canvas></div></div>' +
        '<div class="card"><h3>Xarajat tarkibi</h3><div class="chart-box"><canvas id="ch3"></canvas></div></div>' +
        '<div class="card"><h3>Sheriklar ulushi</h3><table class="tbl"><thead><tr><th>Sherik</th><th class="right">Ulush</th><th class="right">Olingan</th><th class="right">Qolgan</th></tr></thead><tbody>' +
        d.sheriklar.map(function (s) {
          return '<tr><td>' + esc(s.ism) + ' <span class="muted small">' + s.foiz + '%</span></td><td class="right">' + money(s.ulush) + '</td><td class="right">' + money(s.olingan) + '</td><td class="right"><b>' + money(s.qolgan) + '</b></td></tr>';
        }).join('') + '</tbody></table><p class="hint">Faqat hisob. Foydaning qancha qismi biznesga qayta sarflanishini sheriklar hal qiladi.</p></div></div>';
      html += '<h2>Mijozlar tahlili</h2><div class="kpis">' +
        A.kpi('Faol', m.holatlar.faol) + A.kpi('Yangi', m.holatlar.yangi, 'davrda ro\'yxat: ' + m.yangi_davrda) +
        A.kpi('Uxlayotgan', m.holatlar.uxlayotgan, 'sovuyotgan: ' + (m.holatlar.sovuyotgan || 0)) + A.kpi('Ketgan', m.holatlar.ketgan) +
        A.kpi('Qayta buyurtma', UI.pct(m.qayta_ulush), m.tolovchi + ' to\'lovchi mijoz') +
        A.kpi('Jalb qilish narxi', m.jalb_narxi === null ? '—' : money(m.jalb_narxi), 'reklama ' + money(m.reklama) + ' / ' + m.yangi_tolovchi + ' yangi') +
        A.kpi('O\'rtacha umr daromadi', money(m.ortacha_umr_daromadi)) +
        A.kpi('Chegirma / keshbek', money(m.chegirma) + ' / ' + money(m.keshbek_ishlatildi), UI.pct(m.chegirma_ulush) + ' / ' + UI.pct(m.keshbek_ulush) + ' daromaddan') +
        '</div><div class="grid-2col">' +
        '<div class="card"><h3>Paket tuzilmasi</h3><table class="tbl"><thead><tr><th>Paket</th><th class="right">Soni</th><th class="right">Daromad</th></tr></thead><tbody>' +
        m.paketlar.map(function (p) { return '<tr><td>' + p.kunlar + ' kun</td><td class="right">' + p.soni + '</td><td class="right">' + money(p.daromad) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="card"><h3>Manba bo\'yicha</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Manba</th><th class="right">Mijoz</th><th class="right">Daromad</th><th class="right">Qayta</th><th class="right">Jalb narxi</th></tr></thead><tbody>' +
        m.manbalar.map(function (s) {
          return '<tr><td>' + esc(s.manba) + '</td><td class="right">' + s.mijozlar + '</td><td class="right">' + money(s.daromad) + '</td><td class="right">' + UI.pct(s.qayta_ulush) + '</td><td class="right">' + (s.jalb_narxi === null ? '—' : money(s.jalb_narxi)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        '<div class="card"><h3>Hududlar (yetkazish soni)</h3><table class="tbl">' + m.hududlar.map(function (h) {
          return '<tr><td>' + esc(h.hudud) + '</td><td class="right">' + h.soni + '</td></tr>';
        }).join('') + '</table></div></div>';
      UI.view(html, {
        custom: function (form) { var f = UI.formData(form); location.hash = '#/dashboard?davr=custom&dan=' + f.dan + '&gacha=' + f.gacha; }
      });
      drawCharts(d);
    });
  }

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function drawCharts(d) {
    charts.forEach(function (c) { c.destroy(); });
    charts = [];
    if (!window.Chart) return;
    var text = cssVar('--text'), grid = cssVar('--line'), c1 = cssVar('--c1'), c2 = cssVar('--c2'), c3 = cssVar('--c3'), bad = cssVar('--bad');
    Chart.defaults.color = cssVar('--muted');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    var be = d.asosiy.zararsizlik;
    var k = d.grafik.kunlik;
    var sc = { x: { grid: { display: false } }, y: { grid: { color: grid }, beginAtZero: true } };
    charts.push(new Chart(document.getElementById('ch1'), {
      type: 'line',
      data: {
        labels: k.map(function (x) { return UI.dateShort(x.sana); }),
        datasets: [
          { label: 'Yetkazilgan', data: k.map(function (x) { return x.soni; }), borderColor: c1, backgroundColor: c1, tension: 0.25, pointRadius: 2 },
          { label: 'Zararsizlik', data: k.map(function () { return be; }), borderColor: bad, borderDash: [6, 4], pointRadius: 0 },
          { label: 'Reja', data: k.map(function (x) { return x.reja; }), borderColor: c3, borderDash: [2, 3], pointRadius: 0 }
        ]
      },
      options: { maintainAspectRatio: false, scales: sc, plugins: { legend: { labels: { boxWidth: 12, color: text } } } }
    }));
    var mo = d.grafik.oylik;
    charts.push(new Chart(document.getElementById('ch2'), {
      type: 'bar',
      data: {
        labels: mo.map(function (x) { return x.oy; }),
        datasets: [
          { label: 'Daromad', data: mo.map(function (x) { return x.daromad; }), backgroundColor: c1, borderRadius: 4 },
          { label: 'Xarajat', data: mo.map(function (x) { return x.xarajat; }), backgroundColor: c2, borderRadius: 4 },
          { label: 'Foyda', data: mo.map(function (x) { return x.foyda; }), backgroundColor: mo.map(function (x) { return x.foyda < 0 ? bad : c3; }), borderRadius: 4 }
        ]
      },
      options: { maintainAspectRatio: false, scales: sc, plugins: { legend: { labels: { boxWidth: 12, color: text } } } }
    }));
    var ex = d.grafik.xarajat_tarkibi;
    charts.push(new Chart(document.getElementById('ch3'), {
      type: 'bar',
      data: { labels: ex.map(function (x) { return x.turkum; }), datasets: [{ label: 'so\'m', data: ex.map(function (x) { return x.summa; }), backgroundColor: c2, borderRadius: 4 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, scales: { x: { grid: { color: grid }, beginAtZero: true }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    }));
  }

  // ---------- Foydalanuvchilar ----------
  var ROLE_NAMES = { sherik: 'Sherik (admin)', operator: 'Operator', kuryer: 'Kuryer' };
  function users() {
    return api('users').then(function (d) {
      UI.view('<div class="row between"><h1>Foydalanuvchilar</h1><button class="btn small" data-click="edit">+ Qo\'shish</button></div>' +
        '<p class="hint">Hamma Telegram orqali kiradi. Telegram ID ni bilish uchun odam botga /id yozadi.</p><div class="list">' +
        d.items.map(function (u, i) {
          return '<div class="list-item"><div class="grow"><b>' + esc(u.ism) + '</b> ' + (u.faol ? '' : '<span class="badge">o\'chirilgan</span>') +
            '<div class="small muted">' + esc(ROLE_NAMES[u.rol] || u.rol) + ' · ID ' + esc(u.tg_id) + '</div></div>' +
            (u.faol ? '<button class="btn small ghost" data-click="edit" data-i="' + i + '">Tahrir</button><button class="btn small danger" data-click="off" data-i="' + i + '">O\'chirish</button>' : '') + '</div>';
        }).join('') + '</div>', {
        edit: function (el) {
          var u = el.dataset.i !== undefined ? d.items[+el.dataset.i] : { rol: 'operator' };
          var s = UI.sheet(u.id ? 'Tahrirlash' : 'Yangi foydalanuvchi', '<form class="stack" data-submit="save">' +
            UI.field('Ism', '<input name="ism" required value="' + esc(u.ism || '') + '">') +
            UI.field('Telegram ID', '<input name="tg_id" inputmode="numeric" required value="' + esc(u.tg_id || '') + '"' + (u.id ? ' disabled' : '') + '>') +
            UI.field('Rol', '<select name="rol">' + UI.options(d.rollar.map(function (r) { return { value: r, label: ROLE_NAMES[r] }; }), u.rol) + '</select>') +
            '<button class="btn block">Saqlash</button></form>', {
            save: function (form) {
              var f = UI.formData(form); f.id = u.id;
              return api('userSave', f).then(function () { s.close(); UI.reload(); });
            }
          });
        },
        off: function (el) {
          var u = d.items[+el.dataset.i];
          return UI.confirm(u.ism + ' o\'chirilsinmi? Endi tizimga kira olmaydi.', 'O\'chirish', true).then(function (y) {
            if (y) return api('userDeactivate', { id: u.id }).then(UI.reload);
          });
        }
      });
    });
  }

  // ---------- Sozlamalar ----------
  var SETTINGS_UI = [
    ['Yetkazish va kunlar', [
      ['kesish_vaqti', 'Buyurtma kesish vaqti', 'time'],
      ['dam_kunlari', 'Dam olish kunlari', 'weekdays'],
      ['bayramlar', 'Bayram kunlari', 'dates'],
      ['yetkazish_vaqti', 'Yetkazish vaqti (mijozga ko\'rsatiladi)', 'text'],
      ['ertalabki_xabar_vaqti', '"Bugun ovqatingiz yo\'lda" xabari', 'time'],
      ['kun_oxiri_vaqti', 'Kun oxiri (belgilanmaganlar qizil)', 'time'],
      ['eslatma_vaqti', 'Eslatmalar vaqti', 'time']
    ]],
    ['Hududlar', [['hududlar', 'Hududlar ro\'yxati (har qatorda bittadan)', 'lines']]],
    ['Buyurtma qoidalari', [
      ['pauza_foiz', 'Pauza chegarasi, paketning %', 'number'],
      ['narx_kafolat_soat', 'To\'lanmagan buyurtmada narx kafolati, soat', 'number'],
      ['bizning_xato_qoida', 'Bizning ayb bilan yetkazilmasa', 'faultRule'],
      ['paket_eslatma_kun', '"Davom etasizmi?" — paket tugashiga necha kun qolganda', 'number'],
      ['keshbek_eslatma_kun', 'Keshbek muddati tugashiga necha kun qolganda ogohlantirish', 'number']
    ]],
    ['To\'lov va aloqa', [
      ['karta_raqami', 'Karta raqami', 'text'], ['karta_egasi', 'Karta egasi', 'text'], ['aloqa_telefon', 'Aloqa telefoni', 'text']
    ]],
    ['Mijoz holati', [
      ['mijoz_uxlash_kun', '"Uxlayotgan" — paket tugaganiga necha kungacha', 'number'],
      ['mijoz_ketgan_kun', '"Ketgan" — necha kundan ko\'p', 'number']
    ]],
    ['Moliya', [
      ['katta_xarajat', 'Ikkinchi sherik tasdig\'i kerak bo\'lgan xarajat (so\'m)', 'number'],
      ['min_marja_foiz', 'Foyda marjasi ogohlantirish chegarasi, %', 'number'],
      ['sherik_ulushlari', 'Sheriklar ulushi', 'shares'],
      ['ishga_tushish_sana', 'Ishga tushish sanasi (reja chizig\'i uchun)', 'date'],
      ['reja', 'Reja: [[kun, ratsion/kun], ...]', 'text'],
      ['max_summa', 'Bitta summa uchun yuqori chegara', 'number']
    ]],
    ['Telegram va xavfsizlik', [
      ['kuryer_guruh_chat_id', 'Kuryerlar yopiq guruhi chat ID (zaxira ro\'yxat)', 'text'],
      ['rate_limit_daqiqa', 'Bir foydalanuvchi uchun daqiqasiga so\'rovlar', 'number'],
      ['rozilik_matni', 'Rozilik matni (ro\'yxatdan o\'tishda)', 'textarea']
    ]]
  ];

  function settingInput(key, type, val) {
    var n = ' name="' + key + '"';
    switch (type) {
      case 'time': return '<input type="time"' + n + ' value="' + esc(val) + '">';
      case 'number': return '<input type="number" min="0" step="any"' + n + ' value="' + esc(val) + '">';
      case 'date': return '<input type="date"' + n + ' value="' + esc(val) + '">';
      case 'textarea': return '<textarea rows="3"' + n + '>' + esc(val) + '</textarea>';
      case 'faultRule': return '<select' + n + '>' + UI.options([{ value: 'keyinga', label: 'Kun paket oxiriga qo\'shiladi' }, { value: 'keshbek', label: 'Kun qiymati keshbek bilan qoplanadi' }], val) + '</select>';
      case 'weekdays':
        var on = String(val).split(',');
        return '<div class="chips">' + ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'].map(function (w, i) {
          return '<label class="chip"><input type="checkbox" data-wd="' + i + '"' + (on.indexOf(String(i)) >= 0 ? ' checked' : '') + '><span>' + w + '</span></label>';
        }).join('') + '</div><input type="hidden"' + n + ' value="' + esc(val) + '">';
      case 'lines':
        var arr = []; try { arr = JSON.parse(val); } catch (e) { /* bo'sh */ }
        return '<textarea rows="5" data-lines="1"' + n + '>' + esc(arr.join('\n')) + '</textarea>';
      case 'dates':
        var ds = []; try { ds = JSON.parse(val); } catch (e) { /* bo'sh */ }
        return '<textarea rows="3" data-lines="1"' + n + ' placeholder="2026-01-01">' + esc(ds.join('\n')) + '</textarea><span class="hint">Har qatorda bitta sana (YYYY-MM-DD)</span>';
      case 'shares':
        var sh = []; try { sh = JSON.parse(val); } catch (e) { /* bo'sh */ }
        return '<textarea rows="3" data-shares="1"' + n + '>' + esc(sh.map(function (s) { return s.ism + ': ' + s.foiz; }).join('\n')) + '</textarea><span class="hint">Har qatorda "Ism: foiz", yig\'indisi 100</span>';
      default: return '<input' + n + ' value="' + esc(val) + '">';
    }
  }

  function settings() {
    return api('settings').then(function (d) {
      var v = d.qiymatlar;
      var types = {};
      var html = '<h1>Sozlamalar</h1><form data-submit="save" class="stack">' + SETTINGS_UI.map(function (g) {
        return '<div class="card"><h3>' + esc(g[0]) + '</h3>' + g[1].map(function (f) {
          types[f[0]] = f[2];
          return UI.field(f[1], settingInput(f[0], f[2], v[f[0]] || ''));
        }).join('') + '</div>';
      }).join('') + '<button class="btn block sticky-btn">Saqlash</button></form>' +
        '<div class="card"><h3>Xizmat</h3><div class="row gap wrap"><button class="btn small ghost" data-click="backup">💾 Zaxira nusxa hozir</button>' +
        '<button class="btn small ghost" data-click="send">📨 Ertangi ro\'yxatni guruhga yuborish</button></div></div>';
      UI.view(html, {
        save: function (form) {
          var wdInput = form.querySelector('input[name=dam_kunlari]');
          if (wdInput) wdInput.value = Array.prototype.filter.call(form.querySelectorAll('[data-wd]'), function (c) { return c.checked; })
            .map(function (c) { return c.dataset.wd; }).join(',');
          var f = UI.formData(form);
          var out = {};
          Object.keys(f).forEach(function (k) {
            var val = f[k];
            if (types[k] === 'lines' || types[k] === 'dates') val = JSON.stringify(val.split('\n').map(function (x) { return x.trim(); }).filter(Boolean));
            if (types[k] === 'shares') {
              val = JSON.stringify(val.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (line) {
                var i = line.lastIndexOf(':');
                return { ism: line.slice(0, i).trim(), foiz: Number(line.slice(i + 1)) };
              }));
            }
            if (String(val) !== String(v[k] || '')) out[k] = val;
          });
          if (!Object.keys(out).length) return UI.toast('O\'zgarish yo\'q');
          return api('settingsSave', { qiymatlar: out }).then(function () { UI.toast('Saqlandi'); UI.reload(); });
        },
        backup: function () { return api('backupNow').then(function () { UI.toast('Zaxira nusxa olindi'); }); },
        send: function () { return api('sendBackupList', {}).then(function () { UI.toast('Yuborildi'); }); }
      });
    });
  }

  // ---------- Audit ----------
  function audit(params, q) {
    return api('audit', q).then(function (d) {
      UI.view('<h1>Audit</h1><form class="filters" data-submit="f"><input name="q" placeholder="Qidiruv" value="' + esc(q.q || '') + '">' +
        '<select name="varaq">' + UI.options(d.varaqlar, q.varaq, { empty: 'Barcha varaq' }) + '</select>' +
        '<input type="date" name="dan" value="' + esc(q.dan || '') + '"><input type="date" name="gacha" value="' + esc(q.gacha || '') + '">' +
        '<label class="chk"><input type="checkbox" name="muhim"' + (q.muhim ? ' checked' : '') + '> Faqat muhim</label><button class="btn small">Filtr</button></form>' +
        '<p class="hint">Audit faqat o\'qiladi. Muhim: keshbek tuzatish, narx o\'zgarishi, to\'lov tasdiqlash, rol, sozlama.</p>' +
        '<div class="table-wrap"><table class="tbl small"><thead><tr><th>Vaqt</th><th>Kim</th><th>Amal</th><th>Varaq</th><th>Eski → yangi</th></tr></thead><tbody>' +
        d.items.map(function (a) {
          return '<tr class="' + (a.muhim ? 'hl' : '') + '"><td class="nowrap">' + UI.dt(a.vaqt) + '</td><td>' + esc(String(a.kim).split(':')[1] || a.kim) + '</td>' +
            '<td>' + esc(a.amal) + (a.muhim ? ' <span class="badge st-kutilmoqda">' + esc(a.muhim) + '</span>' : '') + '</td><td>' + esc(a.varaq) + '</td>' +
            '<td class="mono">' + (a.eski ? '<span class="neg">' + esc(a.eski) + '</span><br>' : '') + '<span class="save">' + esc(a.yangi) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>', {
        f: function (form) { location.hash = '#/audit' + A.qs(UI.formData(form)); }
      });
    });
  }

  A.routes2 = function () {
    UI.route('pricing', pricing);
    UI.route('expenses', expenses);
    UI.route('payroll', payroll);
    UI.route('dashboard', dashboard);
    UI.route('users', users);
    UI.route('settings', settings);
    UI.route('audit', audit);
  };

  A.start = function (me) {
    A.me = me;
    var partner = me.rol === 'sherik';
    var nav = [
      { path: '', icon: '📋', label: 'Bugun' },
      { path: 'orders', icon: '📦', label: 'Buyurtmalar' },
      { path: 'clients', icon: '👥', label: 'Mijozlar' },
      { path: 'delivery', icon: '🛵', label: 'Yetkazish' },
      { path: 'menu-edit', icon: '🍽', label: 'Menyu', more: true }
    ];
    if (partner) {
      nav = nav.concat([
        { path: 'dashboard', icon: '📊', label: 'Dashboard', more: true },
        { path: 'expenses', icon: '🧾', label: 'Xarajat', more: true },
        { path: 'payroll', icon: '💼', label: 'Oyliklar', more: true },
        { path: 'pricing', icon: '🏷', label: 'Narx va paketlar', more: true },
        { path: 'users', icon: '🔑', label: 'Foydalanuvchilar', more: true },
        { path: 'settings', icon: '⚙️', label: 'Sozlamalar', more: true },
        { path: 'audit', icon: '🕓', label: 'Audit', more: true }
      ]);
    }
    UI.setNav(nav, partner ? 'Admin panel' : 'Operator');
    A.routes1();
    if (partner) A.routes2();
    UI.start();
  };
})();
