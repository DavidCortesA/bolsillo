-- Bolsillo · cargo automático
-- Pégalo en Supabase → SQL Editor → Run (después de 0001, 0002 y 0003). Es seguro volver a ejecutarlo.
--
-- auto_pay:
--   true  = el pago se cobra solo: la app lo da por pagado en cuanto pasa su fecha
--           (si un cargo falla, se desmarca a mano y esa marca gana)
--   false = hay que marcarlo como pagado a mano

alter table public.debts add column if not exists auto_pay boolean not null default false;
