-- Bolsillo · saldo capturado para el saldo proyectado
-- Pégalo en Supabase → SQL Editor → Run (después de 0001 y 0002). Es seguro volver a ejecutarlo.
--
-- Una sola fila por usuario: cuánto tenías (amount) en la fecha as_of, y el monto
-- mínimo (threshold) por debajo del cual quieres que la app te avise.

create table if not exists public.account_balance (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  amount      numeric(12,2) not null,
  as_of       date not null,
  threshold   numeric(12,2) not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.account_balance enable row level security;

drop policy if exists "account_balance: solo dueño" on public.account_balance;

create policy "account_balance: solo dueño" on public.account_balance
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
