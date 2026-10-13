-- Har 15 daqiqada "cron" Edge Function chaqiriladi (eslatmalar, kesish vaqti, keshbek muddati, zaxira).
-- Manzil va maxfiy kalit Vault'da saqlanadi (kodda emas). Bir marta SQL Editor'da:
--   select vault.create_secret('https://<project>.supabase.co', 'project_url');
--   select vault.create_secret('<CRON_SECRET bilan bir xil>', 'cron_secret');
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.unschedule('soglom-cron') where exists (select 1 from cron.job where jobname = 'soglom-cron');
    perform cron.schedule('soglom-cron', '*/15 * * * *', $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/cron?forceFunctionRegion=ap-southeast-2',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000)
      where exists (select 1 from vault.decrypted_secrets where name = 'cron_secret');
    $job$);
  end if;
end $$;
