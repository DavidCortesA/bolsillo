-- Bolsillo · notificaciones push
-- Pégalo en Supabase → SQL Editor → Run (después de 0001 a 0004). Es seguro volver a ejecutarlo.
--
-- push_subscriptions: un dispositivo suscrito a recibir avisos (lo crea la app al activar las notificaciones).
-- reminders:          avisos programados. La app los calcula con tus pagos pendientes y la función
--                     send-reminders envía los que ya vencieron (ver supabase/functions/send-reminders).

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key         text not null,                 -- pago + fecha + anticipación: evita avisos repetidos
  fire_at     timestamptz not null,          -- cuándo debe salir
  title       text not null,
  body        text not null default '',
  url         text not null default '#/calendario',
  sent_at     timestamptz,                   -- null = pendiente
  created_at  timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists reminders_due_idx on public.reminders (fire_at) where sent_at is null;

-- Seguridad (RLS): cada usuario solo ve y modifica lo suyo.
-- La función send-reminders usa la service_role (que ignora RLS) y no se expone en la app.
alter table public.push_subscriptions enable row level security;
alter table public.reminders          enable row level security;

drop policy if exists "push_subscriptions: solo dueño" on public.push_subscriptions;
drop policy if exists "reminders: solo dueño"          on public.reminders;

create policy "push_subscriptions: solo dueño" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "reminders: solo dueño" on public.reminders
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
