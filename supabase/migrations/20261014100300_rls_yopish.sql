-- RLS: frontend (anon/authenticated) jadvallarga to'g'ridan-to'g'ri kira olmaydi.
-- Policy yozilmaydi = hammasi yopiq. Edge Functions SUPABASE_DB_URL (postgres roli) orqali ishlaydi va RLS ga bog'liq emas.
do $$
declare t text;
begin
  foreach t in array array['foydalanuvchilar','mijozlar','manzillar','ratsionlar','narxlar','paketlar','keshbek_qoida',
    'buyurtmalar','yetkazishlar','tolovlar','keshbek_harakat','xarajat_turkum','xarajatlar','xodimlar','oyliklar',
    'audit','sozlama','menyu','kesh'] loop
    execute format('alter table public.%I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all sequences in schema public from anon, authenticated;
    alter default privileges in schema public revoke all on tables from anon, authenticated;
    alter default privileges in schema public revoke all on sequences from anon, authenticated;
    alter default privileges in schema public revoke all on functions from anon, authenticated;
  end if;
end $$;
