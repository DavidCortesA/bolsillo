-- Bolsillo · programa el envío de notificaciones cada 5 minutos
--
-- NO es una migración: tiene valores tuyos que debes reemplazar antes de ejecutarlo.
-- Úsalo en Supabase → SQL Editor, después de:
--   1) correr supabase/migrations/0005_push.sql
--   2) desplegar la función:  supabase functions deploy send-reminders
--      (o crearla en el panel: Edge Functions → Create → pega supabase/functions/send-reminders/*)
--   3) guardar los secretos VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT y CRON_SECRET
--      (los genera:  npm run vapid)
--
-- Reemplaza:
--   <PROJECT_REF>  → el identificador de tu proyecto (la parte antes de .supabase.co)
--   <ANON_KEY>     → tu clave pública (anon / publishable): sirve para pasar la verificación JWT de la función
--   <CRON_SECRET>  → el mismo valor que guardaste como secreto CRON_SECRET
--
-- Nota: este secreto queda guardado en la tabla cron.job de tu propia base; solo lo ven los administradores.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- Si lo vuelves a ejecutar, primero quita la tarea anterior
select cron.unschedule('bolsillo-send-reminders')
where exists (select 1 from cron.job where jobname = 'bolsillo-send-reminders');

select cron.schedule(
  'bolsillo-send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Para revisar que corre:   select * from cron.job_run_details order by start_time desc limit 10;
-- Para detenerlo:           select cron.unschedule('bolsillo-send-reminders');
