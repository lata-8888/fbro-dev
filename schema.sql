-- =====================================================================
-- Vereins-Training: Datenbank-Schema für Supabase
-- Im Supabase-Dashboard unter «SQL Editor» einfügen und mit «Run» ausführen.
-- Das Skript kann bei Bedarf erneut ausgeführt werden (Tabellen bleiben erhalten).
-- =====================================================================

-- ---------- Einstellungen (nur über Funktionen zugänglich) ----------
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
-- absichtlich keine Policy: niemand kann die Tabelle direkt lesen

-- ---------- Profile ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  phone      text not null unique,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Trainings ----------
create table if not exists public.training_rules (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = Sonntag, 1 = Montag
  start_time time not null,
  place      text not null
);

create table if not exists public.training_extras (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  event_date date not null,
  start_time time not null,
  place      text not null
);

-- Einzeländerung eines Termins der Serie (Schlüssel: "<Ursprungsdatum>#<rule_id>")
create table if not exists public.training_overrides (
  training_key text primary key,
  new_date     date not null,
  new_time     time not null,
  new_place    text not null
);

create table if not exists public.training_cancellations (
  training_key text primary key
);

create table if not exists public.training_responses (
  training_key text not null,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null check (status in ('yes', 'no')),
  updated_at   timestamptz not null default now(),
  primary key (training_key, user_id)
);

-- ---------- Events ----------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  event_date date not null,
  start_time time not null,
  place      text not null,
  cancelled  boolean not null default false
);

create table if not exists public.event_responses (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null check (status in ('solo', 'duo', 'no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------- Hilfsfunktionen ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Admin-Rechte vergeben oder entziehen (nur für Admins)
create or replace function public.set_admin(target uuid, make_admin boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Admin-Rechte vergeben';
  end if;
  if target = auth.uid() and not make_admin then
    raise exception 'Du kannst dir die Admin-Rechte nicht selbst entziehen';
  end if;
  update public.profiles set is_admin = make_admin where id = target;
end;
$$;

-- PIN eines Mitglieds auf die letzten 6 Ziffern der Handynummer zurücksetzen (nur für Admins)
create or replace function public.reset_pin(target uuid)
returns void
language plpgsql security definer set search_path = public, extensions, auth
as $$
declare
  ph text;
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen PINs zurücksetzen';
  end if;
  select phone into ph from public.profiles where id = target;
  if ph is null then
    raise exception 'Mitglied nicht gefunden';
  end if;
  update auth.users
     set encrypted_password = crypt(right(regexp_replace(ph, '\D', '', 'g'), 6), gen_salt('bf'))
   where id = target;
end;
$$;

revoke execute on function public.set_admin(uuid, boolean) from public, anon;
revoke execute on function public.reset_pin(uuid)          from public, anon;
grant  execute on function public.set_admin(uuid, boolean) to authenticated;
grant  execute on function public.reset_pin(uuid)          to authenticated;

-- ---------- Registrierung: Vereinscode prüfen, Profil anlegen ----------
create or replace function public.check_club_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  code text;
begin
  select value into code from public.app_settings where key = 'club_code';
  if code is not null and code <> ''
     and coalesce(new.raw_user_meta_data->>'club_code', '') <> code then
    raise exception 'Ungültiger Vereinscode';
  end if;
  return new;
end;
$$;

drop trigger if exists before_user_created on auth.users;
create trigger before_user_created
  before insert on auth.users
  for each row execute function public.check_club_code();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Unbekannt'),
    coalesce(new.raw_user_meta_data->>'phone', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Zugriffsregeln (Row Level Security) ----------
alter table public.profiles               enable row level security;
alter table public.training_rules         enable row level security;
alter table public.training_extras        enable row level security;
alter table public.training_overrides     enable row level security;
alter table public.training_cancellations enable row level security;
alter table public.training_responses     enable row level security;
alter table public.events                 enable row level security;
alter table public.event_responses        enable row level security;

-- Profile: alle angemeldeten Mitglieder sehen alle; jede Person ändert nur ihren Namen
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated, anon;
grant  update (name) on public.profiles to authenticated;

-- Trainingstage, Sondertermine, Änderungen, Absagen, Events:
-- alle lesen, nur Admins ändern
do $$
declare
  t text;
begin
  foreach t in array array[
    'training_rules', 'training_extras', 'training_overrides',
    'training_cancellations', 'events'
  ] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s', t);
    execute format(
      'create policy "%1$s_admin_write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end $$;

-- Antworten: alle lesen, jede Person ändert nur die eigenen
do $$
declare
  t text;
begin
  foreach t in array array['training_responses', 'event_responses'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_own_write" on public.%1$s', t);
    execute format(
      'create policy "%1$s_own_write" on public.%1$s for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- ---------- Live-Aktualisierung (Realtime) ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'training_rules', 'training_extras', 'training_overrides',
    'training_cancellations', 'training_responses', 'events', 'event_responses'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- Tabelle ist bereits enthalten
    end;
  end loop;
end $$;

-- =====================================================================
-- NACH DEM ERSTEN DURCHLAUF (Beispiele, Werte anpassen und einzeln ausführen):
--
-- 1) Vereinscode festlegen (wird bei der Registrierung verlangt):
--    insert into public.app_settings (key, value) values ('club_code', 'MEIN-VEREINSCODE')
--    on conflict (key) do update set value = excluded.value;
--
-- 2) Erstes Training anlegen (Montag 19:00):
--    insert into public.training_rules (weekday, start_time, place)
--    values (1, '19:00', 'Turnhalle Schulhaus Nord');
--
-- 3) Nur falls schon Mitglieder mit eigenem PIN registriert sind: alle PINs auf die
--    letzten 6 Ziffern der Handynummer setzen (einmalig ausführen):
--    update auth.users u
--       set encrypted_password = crypt(right(regexp_replace(p.phone, '\D', '', 'g'), 6), gen_salt('bf'))
--      from public.profiles p where p.id = u.id;
--
-- 4) Ersten Admin festlegen (nachdem du dich in der App registriert hast):
--    update public.profiles set is_admin = true where phone = '+41791234567';
-- =====================================================================
