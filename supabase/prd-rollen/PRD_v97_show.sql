-- =====================================================================
-- PRD v97: Show (Bühnen-Einsatz) mit den Rollen Regisseur und Schauspieler
-- Im SQL Editor von PRD ausführen (idempotent, mehrfach ausführbar).
-- Rückgängig: PRD_v97_show_RUECKGAENGIG.sql
-- Reihenfolge: App-ZIP einspielen, dieses SQL ausführen, danach in der App
-- (Admin > Rollen) Regisseur und Schauspieler zuteilen.
-- =====================================================================

-- 1. Neue Rollen ------------------------------------------------------
alter table public.profiles add column if not exists is_director boolean not null default false;
alter table public.profiles add column if not exists is_actor    boolean not null default false;

create or replace function public.is_director()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_director from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_actor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_actor from public.profiles where id = auth.uid()), false)
$$;

-- Gäste und Kandidaten behalten nie eine Show-Rolle (auch nicht beim Gruppenwechsel)
create or replace function public.profiles_show_roles_guard()
returns trigger
language plpgsql
as $$
begin
  if new.is_guest or new.is_candidate then
    new.is_director := false;
    new.is_actor := false;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_show_roles_guard on public.profiles;
create trigger profiles_show_roles_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_show_roles_guard();

-- Rollen vergeben oder entziehen (nur Admins, nur Mitglieder)
create or replace function public.set_director(target uuid, make_director boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen den Regisseur festlegen';
  end if;
  if make_director and exists (select 1 from public.profiles where id = target and (is_guest or is_candidate)) then
    raise exception 'Gäste und Kandidaten können nicht Regisseur sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_director = make_director where id = target;
end;
$$;

create or replace function public.set_actor(target uuid, make_actor boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Schauspieler festlegen';
  end if;
  if make_actor and exists (select 1 from public.profiles where id = target and (is_guest or is_candidate)) then
    raise exception 'Gäste und Kandidaten können nicht Schauspieler sein. Mache die Person zuerst zum Mitglied.';
  end if;
  update public.profiles set is_actor = make_actor where id = target;
end;
$$;

revoke execute on function public.set_director(uuid, boolean) from public, anon;
grant  execute on function public.set_director(uuid, boolean) to authenticated;
revoke execute on function public.set_actor(uuid, boolean) from public, anon;
grant  execute on function public.set_actor(uuid, boolean) to authenticated;

-- 2. Tabellen: Akt > Szene > Rolle (mit Personen) ----------------------
create table if not exists public.show_acts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  active      boolean not null default false,   -- Häkchen: Planung für die Schauspieler sichtbar
  created_at  timestamptz not null default now()
);
create table if not exists public.show_scenes (
  id          uuid primary key default gen_random_uuid(),
  act_id      uuid not null references public.show_acts(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
create table if not exists public.show_parts (
  id          uuid primary key default gen_random_uuid(),
  scene_id    uuid not null references public.show_scenes(id) on delete cascade,
  name        text not null,
  persons     jsonb not null default '[]'::jsonb,   -- [{"id": "<Profil-ID>", "name": "…"}] oder [{"name": "…"}]
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists show_scenes_act_idx  on public.show_scenes (act_id);
create index if not exists show_parts_scene_idx on public.show_parts (scene_id);

alter table public.show_acts   enable row level security;
alter table public.show_scenes enable row level security;
alter table public.show_parts  enable row level security;

-- 3. Zugriff: Regisseur liest und ändert alles; Schauspieler lesen nur sichtbare Akte.
--    Admin, Gäste und Kandidaten haben ohne Rolle keinen Zugriff.
drop policy if exists "show_acts_director"   on public.show_acts;
drop policy if exists "show_scenes_director" on public.show_scenes;
drop policy if exists "show_parts_director"  on public.show_parts;
create policy "show_acts_director"   on public.show_acts   for all to authenticated using (public.is_director()) with check (public.is_director());
create policy "show_scenes_director" on public.show_scenes for all to authenticated using (public.is_director()) with check (public.is_director());
create policy "show_parts_director"  on public.show_parts  for all to authenticated using (public.is_director()) with check (public.is_director());

drop policy if exists "show_acts_actor_read"   on public.show_acts;
drop policy if exists "show_scenes_actor_read" on public.show_scenes;
drop policy if exists "show_parts_actor_read"  on public.show_parts;
create policy "show_acts_actor_read" on public.show_acts
  for select to authenticated
  using (public.is_actor() and active = true);
create policy "show_scenes_actor_read" on public.show_scenes
  for select to authenticated
  using (public.is_actor()
    and exists (select 1 from public.show_acts a where a.id = show_scenes.act_id and a.active = true));
create policy "show_parts_actor_read" on public.show_parts
  for select to authenticated
  using (public.is_actor()
    and exists (select 1 from public.show_scenes s
                join public.show_acts a on a.id = s.act_id
                where s.id = show_parts.scene_id and a.active = true));

-- 4. Live-Aktualisierung
do $$
declare t text;
begin
  foreach t in array array['show_acts', 'show_scenes', 'show_parts'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
