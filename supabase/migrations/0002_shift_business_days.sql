-- Bolsillo · recorrer fechas al día hábil anterior
-- Pégalo en Supabase → SQL Editor → Run (después de 0001). Es seguro volver a ejecutarlo.
--
-- shift_biz:
--   true  = si la fecha cae en sábado, domingo o festivo, se recorre al día hábil anterior
--   false = se respeta la fecha tal cual
--   null  = valor por defecto de la app (sí para lo quincenal, no para lo demás)

alter table public.debts   add column if not exists shift_biz boolean;
alter table public.incomes add column if not exists shift_biz boolean;
