-- Kaloriya tavsiyasi va vazn statistikasi.
-- 1) Mijoz profili: jins, tug'ilgan yil, bo'y (sm), joriy vazn (kg), maqsad, turmush tarzi,
--    vazn oxirgi marta so'ralgan sana (har 15 kunda bot orqali so'raladi).
alter table mijozlar add column if not exists jins text;
alter table mijozlar add column if not exists tugilgan_yil integer;
alter table mijozlar add column if not exists boy integer;
alter table mijozlar add column if not exists vazn numeric;
alter table mijozlar add column if not exists maqsad text;
alter table mijozlar add column if not exists faollik text;
alter table mijozlar add column if not exists vazn_soralgan date;

-- 2) Vazn tarixi (hech narsa o'chirilmaydi; bir kunda bitta yozuv — shu kun qayta kiritilsa yangilanadi).
create table if not exists vazn_tarix (
  id text primary key,
  mijoz_id text not null references mijozlar(id),
  sana date not null,
  vazn numeric not null check (vazn > 0),
  kim text,
  yaratilgan timestamptz not null default now(),
  tartib bigint generated always as identity
);
create unique index if not exists vazn_tarix_mijoz_sana on vazn_tarix (mijoz_id, sana);

-- 3) RLS: frontend to'g'ridan-to'g'ri kira olmaydi (faqat Edge Function orqali).
alter table vazn_tarix enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.vazn_tarix from anon, authenticated;
  end if;
end $$;
