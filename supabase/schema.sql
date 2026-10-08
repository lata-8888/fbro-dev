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

-- Sprache pro Person (de, fr, en, it, gsw = Züridütsch, uk, bar = Boarisch)
-- Appenzellerisch, Tschechisch und Niederländisch wurden entfernt. Wer eine dieser drei
-- Sprachen gewählt hatte, bekommt die Sprache zurückgesetzt (dann greift wieder die
-- automatische Erkennung anhand der Gerätesprache).
alter table public.profiles add column if not exists language text;
update public.profiles set language = null where language in ('apz', 'cs', 'nl');
alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check
  check (language is null or language in ('de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar'));

-- Darstellung (Hell/Dunkel/Automatisch) pro Person. null = automatisch (folgt der Geräteeinstellung).
alter table public.profiles add column if not exists theme text;
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme is null or theme in ('light', 'dark'));

-- Rollen: Gast (sieht nur Trainings und Profil), Admin (Stern), Chilbi Manager und
-- Chränzli Manager (Weinglas, lösen den früheren Event Manager ab), Jass Manager (Pokal)
-- Gast = false bedeutet Mitglied (Krone). Admin und die Manager-Rollen können nur Mitglieder sein.
-- is_passive unterscheidet Aktiv- von Passivmitgliedern (nur bei Nicht-Gästen von Bedeutung).
alter table public.profiles add column if not exists is_guest boolean not null default false;
alter table public.profiles add column if not exists is_passive boolean not null default false;
-- Supporter: eine vierte Gruppe neben Aktiv-/Passivmitglied/Gast, gleich dargestellt wie Gäste.
alter table public.profiles add column if not exists is_supporter boolean not null default false;
-- Kandidat: entsteht automatisch, wenn sich jemand selber über den Login-Bildschirm registriert
-- (siehe handle_new_user). Kandidaten sehen in der App nur eine Warteseite, keine Inhalte.
alter table public.profiles add column if not exists is_candidate boolean not null default false;
-- Zeigt im Admin-Bereich an, ob die Person ihren PIN schon selbst geändert hat (grün) oder noch
-- den Standard-PIN nutzt (rot). Wird beim Ändern gesetzt und bei einem Reset/Nummernwechsel geleert.
alter table public.profiles add column if not exists pin_changed boolean not null default false;
alter table public.profiles add column if not exists is_event_manager boolean not null default false;   -- abgelöst durch is_chilbi_manager/is_chraenzli_manager, Spalte bleibt für Altdaten erhalten
alter table public.profiles add column if not exists is_chilbi_manager boolean not null default false;
alter table public.profiles add column if not exists is_chraenzli_manager boolean not null default false;
alter table public.profiles add column if not exists is_jass_master boolean not null default false;
update public.profiles set is_admin = false, is_passive = false, is_event_manager = false,
       is_chilbi_manager = false, is_chraenzli_manager = false, is_jass_master = false where is_guest;
alter table public.profiles drop constraint if exists profiles_roles_check;
alter table public.profiles add constraint profiles_roles_check
  check (not ((is_guest or is_candidate) and (is_admin or is_event_manager or is_chilbi_manager or is_chraenzli_manager or is_jass_master)));

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
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  event_date    date not null,
  start_time    time not null,
  place         text not null,
  cancelled     boolean not null default false,
  rsvp_required boolean not null default false
);
alter table public.events add column if not exists rsvp_required boolean not null default false;

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

-- Gilt überall dort als «eingeschränkt», wo die Datenbank Zugriffe auf Trainings, Jass und
-- das eigene Profil begrenzt: echte Gäste, Kandidaten und die Gruppe «Friends & Family» sehen
-- weder Events noch C&C – auch nicht über einen direkten API-Zugriff. Admin ist davon immer
-- ausgenommen (z. B. falls ein Admin zusätzlich bei Friends & Family eingeteilt ist).
create or replace function public.is_guest()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select (is_guest or is_candidate or is_supporter) and not is_admin
    from public.profiles where id = auth.uid()
  ), false)
$$;

-- Engere Variante nur für Jass: «Friends & Family» darf Jass weiterhin lesen (wie Trainings),
-- nur echte Gäste und Kandidaten sind hier ausgeschlossen.
create or replace function public.is_guest_strict()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_guest or is_candidate from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_event_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_event_manager from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_chilbi_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_chilbi_manager from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_chraenzli_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_chraenzli_manager from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_jass_master()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_jass_master from public.profiles where id = auth.uid()), false)
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

-- Zwischen Gast und Mitglied wechseln (nur für Admins). Wer Gast wird, verliert Admin- und Manager-Rechte.
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
         is_passive = case when make_guest then false else is_passive end,
         is_supporter = case when make_guest then false else is_supporter end,
         is_candidate = case when make_guest then false else is_candidate end,
         is_admin = case when make_guest then false else is_admin end,
         is_event_manager = case when make_guest then false else is_event_manager end,
         is_chilbi_manager = case when make_guest then false else is_chilbi_manager end,
         is_chraenzli_manager = case when make_guest then false else is_chraenzli_manager end,
         is_jass_master = case when make_guest then false else is_jass_master end
   where id = target;
end;
$$;

-- Aktiv- oder Passivmitglied (nur für Admins, nur für Mitglieder, nicht für Gäste)
create or replace function public.set_passive(target uuid, make_passive boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen den Aktiv/Passiv-Status ändern';
  end if;
  update public.profiles set is_passive = make_passive where id = target and not is_guest;
end;
$$;

-- Supporter (nur für Admins, nur für Mitglieder, nicht für Gäste)
create or replace function public.set_supporter(target uuid, make_supporter boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen den Supporter-Status ändern';
  end if;
  update public.profiles set is_supporter = make_supporter where id = target and not is_guest;
end;
$$;

-- Vereinheitlichtes Umteilen einer Person in genau eine der fünf Gruppen
-- (aktiv, passiv, gast, weitere, kandidat) – die Gruppen schliessen sich gegenseitig aus.
-- Beim Wechsel zu Gast oder Kandidat werden Admin- und Manager-Rechte automatisch entzogen.
create or replace function public.set_member_group(target uuid, grp text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen die Gruppe ändern';
  end if;
  if grp not in ('active', 'passive', 'guest', 'other', 'candidate') then
    raise exception 'Unbekannte Gruppe: %', grp;
  end if;
  if target = auth.uid() and grp in ('guest', 'candidate') then
    raise exception 'Du kannst dich nicht selbst zum Gast oder Kandidat machen';
  end if;
  update public.profiles set
    is_guest = (grp = 'guest'),
    is_passive = (grp = 'passive'),
    is_supporter = (grp = 'other'),
    is_candidate = (grp = 'candidate'),
    is_admin = case when grp in ('guest', 'candidate') then false else is_admin end,
    is_event_manager = case when grp in ('guest', 'candidate') then false else is_event_manager end,
    is_chilbi_manager = case when grp in ('guest', 'candidate') then false else is_chilbi_manager end,
    is_chraenzli_manager = case when grp in ('guest', 'candidate') then false else is_chraenzli_manager end,
    is_jass_master = case when grp in ('guest', 'candidate') then false else is_jass_master end
   where id = target;
end;
$$;

-- Event Manager-Rechte vergeben oder entziehen (nur für Admins, nur für Mitglieder)
-- Hinweis: abgelöst durch set_chilbi_manager/set_chraenzli_manager, Funktion bleibt für Altdaten erhalten
create or replace function public.set_event_manager(target uuid, make_manager boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Event Manager festlegen';
  end if;
  if make_manager and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Event Manager sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_event_manager = make_manager where id = target;
end;
$$;

-- Chilbi Manager vergeben oder entziehen (nur für Admins, nur für Mitglieder)
create or replace function public.set_chilbi_manager(target uuid, make_manager boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Chilbi Manager festlegen';
  end if;
  if make_manager and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Chilbi Manager sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_chilbi_manager = make_manager where id = target;
end;
$$;

-- Chränzli Manager vergeben oder entziehen (nur für Admins, nur für Mitglieder)
create or replace function public.set_chraenzli_manager(target uuid, make_manager boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Chränzli Manager festlegen';
  end if;
  if make_manager and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Chränzli Manager sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_chraenzli_manager = make_manager where id = target;
end;
$$;

-- Jass-Master-Rechte vergeben oder entziehen (nur für Admins, nur für Mitglieder).
-- Nur Admins und Jass-Master dürfen Jass-Daten (Teilnehmer, Spielplan, Punkte) ändern.
create or replace function public.set_jass_master(target uuid, make_master boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Jass-Master festlegen';
  end if;
  if make_master and exists (select 1 from public.profiles where id = target and is_guest) then
    raise exception 'Gäste können nicht Jass-Master sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_jass_master = make_master where id = target;
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
  update public.profiles set pin_changed = false where id = target;
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
revoke execute on function public.set_jass_master(uuid, boolean) from public, anon;
grant  execute on function public.set_jass_master(uuid, boolean) to authenticated;
revoke execute on function public.set_chilbi_manager(uuid, boolean) from public, anon;
grant  execute on function public.set_chilbi_manager(uuid, boolean) to authenticated;
revoke execute on function public.set_chraenzli_manager(uuid, boolean) from public, anon;
grant  execute on function public.set_chraenzli_manager(uuid, boolean) to authenticated;
revoke execute on function public.set_supporter(uuid, boolean) from public, anon;
grant  execute on function public.set_supporter(uuid, boolean) to authenticated;
revoke execute on function public.set_member_group(uuid, text) from public, anon;
grant  execute on function public.set_member_group(uuid, text) to authenticated;
revoke execute on function public.set_passive(uuid, boolean) from public, anon;
grant  execute on function public.set_passive(uuid, boolean) to authenticated;
revoke execute on function public.get_club_code()          from public, anon;
revoke execute on function public.remove_member(uuid)      from public, anon;
grant  execute on function public.get_club_code()          to authenticated;
grant  execute on function public.remove_member(uuid)      to authenticated;
revoke execute on function public.reset_pin(uuid)          from public, anon;
grant  execute on function public.set_admin(uuid, boolean) to authenticated;
grant  execute on function public.reset_pin(uuid)          to authenticated;

-- Name und Handynummer eines Mitglieds ändern (nur für Admins).
-- Bei einer neuen Nummer ändert sich auch die Anmeldung, und es gilt wieder der Standard-PIN.
create or replace function public.admin_update_member(target uuid, new_name text, new_phone text)
returns void
language plpgsql security definer set search_path = public, extensions, auth
as $$
declare
  old_phone text;
  old_email text;
  new_email text;
  digits    text;
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Mitglieder ändern';
  end if;
  new_name := trim(coalesce(new_name, ''));
  if new_name = '' then
    raise exception 'Name fehlt';
  end if;
  if coalesce(new_phone, '') !~ '^\+[0-9]{9,15}$' then
    raise exception 'Ungültige Handynummer';
  end if;
  select phone into old_phone from public.profiles where id = target;
  if old_phone is null then
    raise exception 'Mitglied nicht gefunden';
  end if;
  if new_phone <> old_phone then
    if exists (select 1 from public.profiles where phone = new_phone and id <> target) then
      raise exception 'PHONE_TAKEN';
    end if;
    select email into old_email from auth.users where id = target;
    digits := regexp_replace(new_phone, '\D', '', 'g');
    new_email := digits || '@' || split_part(old_email, '@', 2);
    update auth.users
       set email = new_email,
           encrypted_password = crypt(right(digits, 6), gen_salt('bf')),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', new_phone, 'name', new_name)
     where id = target;
    update auth.identities
       set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', new_email)
     where user_id = target and provider = 'email';
    update public.profiles set pin_changed = false where id = target;
  end if;
  update public.profiles set name = new_name, phone = new_phone where id = target;
end;
$$;
revoke execute on function public.admin_update_member(uuid, text, text) from public, anon;
grant  execute on function public.admin_update_member(uuid, text, text) to authenticated;

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
  -- «created_by_admin» wird nur vom Admin-Formular («Gruppen → +») mitgeschickt.
  -- Fehlt es (echte Selbstregistrierung über den Login-Bildschirm), wird die Person
  -- automatisch zum Kandidaten und sieht in der App nur die Warteseite.
  insert into public.profiles (id, name, phone, language, is_candidate)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Unbekannt'),
    coalesce(new.raw_user_meta_data->>'phone', new.email),
    case when new.raw_user_meta_data->>'language' in ('de', 'fr', 'en', 'it', 'gsw', 'uk', 'bar')
         then new.raw_user_meta_data->>'language' else null end,
    coalesce(new.raw_user_meta_data->>'created_by_admin', '') <> 'true'
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
grant  update (name, language, pin_changed, theme) on public.profiles to authenticated;

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

-- Events: alle ausser Gästen lesen, nur Event Manager ändern (Admin nur, wenn er sich die Rolle selbst gibt)
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select to authenticated using (not public.is_guest());
drop policy if exists "events_admin_write" on public.events;
drop policy if exists "events_manage_write" on public.events;
create policy "events_manage_write" on public.events
  for all to authenticated
  using (public.is_event_manager())
  with check (public.is_event_manager());

-- Antworten auf Events: Gäste sehen und ändern nichts, alle anderen ändern nur die eigenen.
-- Zusätzlich dürfen Event Manager und Admins die Antwort jeder Person setzen (Teilnehmer verwalten).
drop policy if exists "event_responses_select" on public.event_responses;
create policy "event_responses_select" on public.event_responses
  for select to authenticated using (not public.is_guest());
drop policy if exists "event_responses_own_write" on public.event_responses;
create policy "event_responses_own_write" on public.event_responses
  for all to authenticated
  using (user_id = auth.uid() and not public.is_guest())
  with check (user_id = auth.uid() and not public.is_guest());
drop policy if exists "event_responses_manager_write" on public.event_responses;
create policy "event_responses_manager_write" on public.event_responses
  for all to authenticated
  using (public.is_event_manager() or public.is_admin())
  with check (public.is_event_manager() or public.is_admin());

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

-- Admin darf die Trainingsantworten aller Personen setzen (Teilnehmer bearbeiten)
drop policy if exists "training_responses_admin_write" on public.training_responses;
create policy "training_responses_admin_write" on public.training_responses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

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
-- C&C: Chränzli und Chilbi (Anlass > Tag > Schicht > Rolle)
-- Nur Admins, Chilbi Manager und Chränzli Manager dürfen ändern; lesen dürfen sie zusätzlich,
-- wenn «cc_is_public» aktiv ist, auch alle Aktiv- und Passivmitglieder (siehe weiter unten).
-- =====================================================================
create table if not exists public.cc_events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.cc_days (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.cc_events(id) on delete cascade,
  day        date not null,
  name       text,
  created_at timestamptz not null default now()
);
create table if not exists public.cc_shifts (
  id         uuid primary key default gen_random_uuid(),
  day_id     uuid not null references public.cc_days(id) on delete cascade,
  start_time time not null,
  end_time   time not null,              -- kleiner oder gleich Start = endet am Folgetag
  name       text,
  created_at timestamptz not null default now()
);
create table if not exists public.cc_roles (
  id         uuid primary key default gen_random_uuid(),
  shift_id   uuid not null references public.cc_shifts(id) on delete cascade,
  name       text not null,
  persons    jsonb not null default '[]'::jsonb,  -- [{"id": "<Profil-ID>", "name": "…"}] oder [{"name": "…"}] für Andere
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);
-- Row Level Security sofort einschalten (vor den Zugriffsregeln weiter unten)
alter table public.cc_events enable row level security;
alter table public.cc_days   enable row level security;
alter table public.cc_shifts enable row level security;
alter table public.cc_roles  enable row level security;

create index if not exists cc_days_event_idx  on public.cc_days (event_id);
create index if not exists cc_shifts_day_idx  on public.cc_shifts (day_id);
create index if not exists cc_roles_shift_idx on public.cc_roles (shift_id);

create or replace function public.can_cc()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_chilbi_manager() or public.is_chraenzli_manager()
$$;

-- Schaltet C&C für alle angemeldeten Personen lesbar (true) oder nur für
-- Admin/Chilbi Manager/Chränzli Manager sichtbar (false, Standard).
create or replace function public.cc_is_public()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'cc_public'), false)
$$;
revoke execute on function public.cc_is_public() from public, anon;
grant  execute on function public.cc_is_public() to authenticated;

create or replace function public.set_cc_public(make_public boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_cc() then
    raise exception 'Nur Admin, Chilbi Manager oder Chränzli Manager dürfen die Sichtbarkeit von C&C ändern';
  end if;
  insert into public.app_settings (key, value) values ('cc_public', make_public::text)
    on conflict (key) do update set value = excluded.value;
end;
$$;
revoke execute on function public.set_cc_public(boolean) from public, anon;
grant  execute on function public.set_cc_public(boolean) to authenticated;

-- Lese-Policy für normale Mitglieder: C&C ist lesbar, wenn der zugehörige Anlass aktiv ist.
-- Damit steuern die Häkchen bei Chränzli/Chilbi, ob normale Mitglieder den Tab sehen.
-- Gäste und Kandidaten bleiben ausgeschlossen (is_guest()).
drop policy if exists "cc_events_public_read" on public.cc_events;
create policy "cc_events_public_read" on public.cc_events
  for select to authenticated
  using (active = true and not public.is_guest() and not public.can_cc());

drop policy if exists "cc_days_public_read" on public.cc_days;
create policy "cc_days_public_read" on public.cc_days
  for select to authenticated
  using (not public.is_guest() and not public.can_cc()
    and exists (select 1 from public.cc_events e where e.id = cc_days.event_id and e.active = true));

drop policy if exists "cc_shifts_public_read" on public.cc_shifts;
create policy "cc_shifts_public_read" on public.cc_shifts
  for select to authenticated
  using (not public.is_guest() and not public.can_cc()
    and exists (
      select 1 from public.cc_days d
      join public.cc_events e on e.id = d.event_id
      where d.id = cc_shifts.day_id and e.active = true));

drop policy if exists "cc_roles_public_read" on public.cc_roles;
create policy "cc_roles_public_read" on public.cc_roles
  for select to authenticated
  using (not public.is_guest() and not public.can_cc()
    and exists (
      select 1 from public.cc_shifts s
      join public.cc_days d on d.id = s.day_id
      join public.cc_events e on e.id = d.event_id
      where s.id = cc_roles.shift_id and e.active = true));

create or replace function public.can_jass()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_jass_master()
$$;

do $$
declare
  t text;
begin
  foreach t in array array['cc_events', 'cc_days', 'cc_shifts', 'cc_roles'] loop
    execute format('drop policy if exists "%1$s_cc" on public.%1$s', t);
    execute format('create policy "%1$s_cc" on public.%1$s for all to authenticated using (public.can_cc()) with check (public.can_cc())', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- Startinhalt: Chränzli 2027 und Chilbi 2027 (wird nur einmal angelegt)
do $$
declare
  e uuid; d uuid; s uuid;
begin
  if exists (select 1 from public.app_settings where key = 'cc_seeded') then
    return;
  end if;
  if not exists (select 1 from public.cc_events where name = 'Chränzli 2027') then
    insert into public.cc_events (name, active) values ('Chränzli 2027', true) returning id into e;
    insert into public.cc_days (event_id, day, name) values (e, '2027-01-14', 'Aufbau') returning id into d;
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '19:00', '22:00') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Team', '[{"name": "Markus Notz"}, {"name": "Thomas Walter"}]'::jsonb, 0);
    insert into public.cc_days (event_id, day, name) values (e, '2027-01-15', 'Premiere') returning id into d;
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '20:00', '21:30') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Bühne', '[{"name": "Beni Anderegg"}, {"name": "Beat Latanzio"}, {"name": "Alex Häusler"}, {"name": "Dani Oetterli"}, {"name": "Bruno Daneffel"}]'::jsonb, 0);
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '20:00', '02:00') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Bar', '[{"name": "Beni Anderegg"}, {"name": "Beat Latanzio"}, {"name": "Alex Häusler"}, {"name": "Dani Oetterli"}]'::jsonb, 0);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Troubleshooter', '[{"name": "Daniel Oetterli"}]'::jsonb, 1);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Backup', '[{"name": "Claudio Vanoli"}, {"name": "Bruno Daneffel"}, {"name": "Ruedi"}]'::jsonb, 2);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Tageschef', '[{"name": "Mäke Notz"}, {"name": "Marco Citrini"}]'::jsonb, 3);
    insert into public.cc_days (event_id, day, name) values (e, '2027-01-16', 'Gala-Abend') returning id into d;
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '20:00', '21:30') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Bühne', '[{"name": "Beni Anderegg"}, {"name": "Beat Latanzio"}, {"name": "Alex Häusler"}, {"name": "Dani Oetterli"}, {"name": "Bruno Daneffel"}]'::jsonb, 0);
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '20:00', '02:00') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Bar', '[{"name": "Chrigi Harder"}, {"name": "Roger Dettling"}, {"name": "Caro Rein"}]'::jsonb, 0);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Troubleshooter', '[{"name": "Tobias Walterth"}]'::jsonb, 1);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Backup', '[{"name": "Patrick Meile"}]'::jsonb, 2);
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Tageschef', '[{"name": "Mäke Notz"}]'::jsonb, 3);
    insert into public.cc_days (event_id, day, name) values (e, '2027-01-17', 'Abräumen') returning id into d;
    insert into public.cc_shifts (day_id, start_time, end_time) values (d, '10:00', '12:00') returning id into s;
    insert into public.cc_roles (shift_id, name, persons, sort) values (s, 'Abräumen', '[{"name": "Ruedi Bachmann"}, {"name": "Markus Notz"}, {"name": "Brian Baiocco"}, {"name": "Christian Kunz"}, {"name": "Marco Meroni"}]'::jsonb, 0);
  end if;
  if not exists (select 1 from public.cc_events where name = 'Chilbi 2027') then
    insert into public.cc_events (name, active) values ('Chilbi 2027', false);
  end if;
  insert into public.app_settings (key, value) values ('cc_seeded', 'yes') on conflict (key) do nothing;
end $$;

-- =====================================================================
-- Jass: Jassmasters-Serien mit Jasstagen, Teilnehmern und Punkten
-- Sichtbar für alle angemeldeten Personen (Mitglieder, Gäste), damit jeder
-- die Tagesrangliste sieht. Bearbeiten dürfen nur Admins und Event Manager.
-- =====================================================================
create table if not exists public.jass_series (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.jass_days (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references public.jass_series(id) on delete cascade,
  day        date not null,
  name       text,  -- optionale Bezeichnung, z. B. "32. Jassmasters"
  players    jsonb not null default '[null, null, null, null, null, null, null, null]'::jsonb,
  scores     jsonb not null default '{}'::jsonb,  -- z. B. {"1A": 157, "1B": -40}; Team I positiv, Team II negativ
  created_at timestamptz not null default now()
);
alter table public.jass_days add column if not exists name text;
-- «closed» verschiebt einen Jasstag manuell von «Anstehend» nach «Vergangen», unabhängig vom Datum.
-- «manual_ranking» ist eine von Hand gepflegte Rangliste (z. B. für historisch importierte Runden
-- ohne Einzelspiel-Daten): [{"name": "...", "id": "<Profil-ID oder null>", "points": 32}, ...].
-- Ist sie gesetzt, hat sie Vorrang vor der aus den Spiel-Punkten berechneten Rangliste.
alter table public.jass_days add column if not exists closed boolean not null default false;
alter table public.jass_days add column if not exists manual_ranking jsonb;
-- «active» steuert bei anstehenden Jasstagen die Sichtbarkeit (Häkchen, wie bei Chränzli/Chilbi).
-- Ohne Haken sehen nur Admin und Jass Manager die Runde; sobald sie abgeschlossen ist (closed),
-- bleibt sie unabhängig von «active» für alle sichtbar.
alter table public.jass_days add column if not exists active boolean not null default true;
create index if not exists jass_days_series_idx on public.jass_days (series_id);

alter table public.jass_series enable row level security;
alter table public.jass_days   enable row level security;

drop policy if exists "jass_series_select" on public.jass_series;
create policy "jass_series_select" on public.jass_series for select to authenticated using (not public.is_guest_strict());
drop policy if exists "jass_series_write" on public.jass_series;
create policy "jass_series_write" on public.jass_series for all to authenticated using (public.can_jass()) with check (public.can_jass());

drop policy if exists "jass_days_select" on public.jass_days;
create policy "jass_days_select" on public.jass_days for select to authenticated
  using (not public.is_guest_strict() and (public.can_jass() or active or closed));
drop policy if exists "jass_days_write" on public.jass_days;
create policy "jass_days_write" on public.jass_days for all to authenticated using (public.can_jass()) with check (public.can_jass());

do $$
begin
  begin
    alter publication supabase_realtime add table public.jass_series;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.jass_days;
  exception when duplicate_object then null;
  end;
end $$;

-- Eine einzelne Punktzahl setzen oder löschen (nur Admins und Event Manager).
-- p_game ist z. B. '1A' (Runde 1, Tisch A). p_pts ist die Punktzahl von Team I, oder null zum Löschen.
create or replace function public.jass_set_score(p_day uuid, p_game text, p_pts integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_jass() then
    raise exception 'Keine Berechtigung für Jass';
  end if;
  if p_game !~ '^[1-9][0-9]*[A-Z]$' then
    raise exception 'Ungültiges Spiel';
  end if;
  if p_pts is null then
    update public.jass_days set scores = scores - p_game where id = p_day;
  else
    update public.jass_days set scores = scores || jsonb_build_object(p_game, p_pts) where id = p_day;
  end if;
end;
$$;
revoke execute on function public.jass_set_score(uuid, text, integer) from public, anon;
grant  execute on function public.jass_set_score(uuid, text, integer) to authenticated;

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
--
-- 5) Kontrolle: Bei allen Tabellen muss rls_aktiv = true stehen.
--    select tablename, rowsecurity as rls_aktiv from pg_tables where schemaname = 'public' order by tablename;
-- =====================================================================
