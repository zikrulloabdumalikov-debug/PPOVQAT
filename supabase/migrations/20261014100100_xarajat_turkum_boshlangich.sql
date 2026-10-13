-- Boshlang'ich xarajat turkumlari (TZ 9.1). Sheriklar keyin ilovada o'zgartiradi.
insert into xarajat_turkum (id, nom, guruh, kod, hissa, faol) values
  ('tk_bozorlik',  'Bozorlik',                       'ozgaruvchan', 'bozorlik',  true,  true),
  ('tk_qadoq',     'Qadoq va idish',                 'ozgaruvchan', 'qadoq',     true,  true),
  ('tk_yetkazish', 'Yetkazish yoqilg''isi / taksi',  'ozgaruvchan', 'yetkazish', true,  true),
  ('tk_reklama',   'Reklama',                        'ozgaruvchan', 'reklama',   false, true),
  ('tk_boshqa_oz', 'Boshqa o''zgaruvchan',           'ozgaruvchan', null,        false, true),
  ('tk_ijara',     'Ijara',                          'doimiy',      'ijara',     false, true),
  ('tk_elektr',    'Elektr',                         'doimiy',      null,        false, true),
  ('tk_internet',  'Internet',                       'doimiy',      null,        false, true),
  ('tk_boshqa_do', 'Boshqa oylik to''lovlar',        'doimiy',      null,        false, true),
  ('tk_oylik',     'Oylik',                          'oylik',       'oylik',     false, true),
  ('tk_sherik',    'Sherik taqsimoti',               'sherik',      'sherik',    false, true)
on conflict (id) do nothing;
