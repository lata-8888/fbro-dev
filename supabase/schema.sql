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

-- Sprache pro Person (de, fr, en, it, gsw = Züridütsch, uk, bar = Boarisch, cs = Tschechisch, nl = Niederländisch)
alter table public.profiles add column if not exists language text;
alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check
  check (language is null or language in ('de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar', 'cs', 'nl'));

-- Rollen: Gast (sieht nur Trainings und Profil), Admin (Stern), Event-Manager (Weinglas)
-- Gast = false bedeutet Mitglied (Krone). Admin und Event-Manager können nur Mitglieder sein.
alter table public.profiles add column if not exists is_guest boolean not null default false;
alter table public.profiles add column if not exists is_event_manager boolean not null default false;
update public.profiles set is_admin = false, is_event_manager = false where is_guest;
alter table public.profiles drop constraint if exists profiles_roles_check;
alter table public.profiles add constraint profiles_roles_check
  check (not (is_guest and (is_admin or is_event_manager)));

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

create or replace function public.is_guest()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_guest from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_event_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_event_manager from public.profiles where id = auth.uid()), false)
$$;

-- Admin-Rechte vergeben oder entziehen (nur für Admins). Nur Mitglieder können Admin sein.
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
  if make_admin and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Admin sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_admin = make_admin where id = target;
end;
$$;

-- Zwischen Gast und Mitglied wechseln (nur für Admins). Wer Gast wird, verliert Admin- und Event-Manager-Rechte.
create or replace function public.set_guest(target uuid, make_guest boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen den Gast-Status ändern';
  end if;
  if target = auth.uid() and make_guest then
    raise exception 'Du kannst dich nicht selbst zum Gast machen';
  end if;
  update public.profiles
     set is_guest = make_guest,
         is_admin = case when make_guest then false else is_admin end,
         is_event_manager = case when make_guest then false else is_event_manager end
   where id = target;
end;
$$;

-- Event-Manager-Rechte vergeben oder entziehen (nur für Admins, nur für Mitglieder)
create or replace function public.set_event_manager(target uuid, make_manager boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Event-Manager festlegen';
  end if;
  if make_manager and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Event-Manager sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_event_manager = make_manager where id = target;
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

-- Vereinscode auslesen (nur Admins; wird beim Hinzufügen von Mitgliedern benötigt)
create or replace function public.get_club_code()
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  code text;
begin
  if not public.is_admin() then
    raise exception 'Nur Admins';
  end if;
  select value into code from public.app_settings where key = 'club_code';
  return coalesce(code, '');
end;
$$;

-- Mitglied samt Konto und Antworten entfernen (nur Admins)
create or replace function public.remove_member(target uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Mitglieder entfernen';
  end if;
  if target = auth.uid() then
    raise exception 'Du kannst dich nicht selbst entfernen';
  end if;
  delete from auth.users where id = target;  -- löscht über «on delete cascade» auch Profil und Antworten
end;
$$;

revoke execute on function public.set_admin(uuid, boolean) from public, anon;
revoke execute on function public.set_guest(uuid, boolean) from public, anon;
grant  execute on function public.set_guest(uuid, boolean) to authenticated;
revoke execute on function public.set_event_manager(uuid, boolean) from public, anon;
grant  execute on function public.set_event_manager(uuid, boolean) to authenticated;
revoke execute on function public.get_club_code()          from public, anon;
revoke execute on function public.remove_member(uuid)      from public, anon;
grant  execute on function public.get_club_code()          to authenticated;
grant  execute on function public.remove_member(uuid)      to authenticated;
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
  insert into public.profiles (id, name, phone, language)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Unbekannt'),
    coalesce(new.raw_user_meta_data->>'phone', new.email),
    case when new.raw_user_meta_data->>'language' in ('de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar', 'cs', 'nl')
         then new.raw_user_meta_data->>'language' else null end
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
grant  update (name, language) on public.profiles to authenticated;

-- Trainingstage, Sondertermine, Änderungen, Absagen:
-- alle lesen, nur Admins ändern
do $$
declare
  t text;
begin
  foreach t in array array[
    'training_rules', 'training_extras', 'training_overrides',
    'training_cancellations'
  ] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s', t);
    execute format(
      'create policy "%1$s_admin_write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end $$;

-- Events: alle ausser Gästen lesen, Admins und Event-Manager ändern
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated using (not public.is_guest());
drop policy if exists "events_admin_write" on public.events;
drop policy if exists "events_manage_write" on public.events;
create policy "events_manage_write" on public.events
  for all to authenticated
  using (public.is_admin() or public.is_event_manager())
  with check (public.is_admin() or public.is_event_manager());

-- Antworten auf Events: Gäste sehen und ändern nichts, alle anderen ändern nur die eigenen
drop policy if exists "event_responses_select" on public.event_responses;
create policy "event_responses_select" on public.event_responses
  for select to authenticated using (not public.is_guest());
drop policy if exists "event_responses_own_write" on public.event_responses;
create policy "event_responses_own_write" on public.event_responses
  for all to authenticated
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid() and not public.is_guest());

-- Antworten auf Trainings: alle lesen, jede Person ändert nur die eigenen
do $$
declare
  t text;
begin
  foreach t in array array['training_responses'] loop
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
