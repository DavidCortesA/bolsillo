-- Bolsillo · esquema inicial
-- Pégalo completo en Supabase → SQL Editor → Run. Es seguro volver a ejecutarlo.

-- ─────────────────────────────────────────────────────────────────────────────
-- Deudas y pagos (Kueski, tarjetas, streaming, tandas, colegiatura, inscripción…)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.debts (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  cat            text not null default 'otro',
  amount         numeric(12,2) not null check (amount >= 0),
  freq           text not null check (freq in ('unico','mensual','quincenal','cada14','anual')),
  qdays          text not null default '15-fin',   -- días de pago si es quincenal
  start_date     date not null,                    -- fecha del primer pago
  count          int  check (count > 0),           -- nº de pagos (null = indefinido)
  end_date       date,                             -- opcional: deja de cobrarse
  paid_until     date,                             -- pagos hasta esta fecha ya están hechos
  notes          text,
  payout_date    date,                             -- tandas: cuándo te toca cobrar
  payout_amount  numeric(12,2),                    -- tandas: cuánto cobras
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ingresos (fijos y variables)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.incomes (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null default 'fijo' check (type in ('fijo','variable')),
  amount      numeric(12,2) not null check (amount >= 0),
  freq        text not null check (freq in ('unico','mensual','quincenal','cada14','anual')),
  qdays       text not null default '15-fin',
  start_date  date not null,
  count       int  check (count > 0),
  end_date    date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Marcas de "pagado" por cada ocurrencia (key = '<id de la deuda>|<fecha>')
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.payment_marks (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key         text not null,
  paid        boolean not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists debts_user_idx   on public.debts   (user_id);
create index if not exists incomes_user_idx on public.incomes (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seguridad (RLS): cada usuario solo ve y modifica sus propias filas
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.debts         enable row level security;
alter table public.incomes       enable row level security;
alter table public.payment_marks enable row level security;

drop policy if exists "debts: solo dueño"         on public.debts;
drop policy if exists "incomes: solo dueño"       on public.incomes;
drop policy if exists "payment_marks: solo dueño" on public.payment_marks;

create policy "debts: solo dueño"         on public.debts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "incomes: solo dueño"       on public.incomes
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "payment_marks: solo dueño" on public.payment_marks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
