-- Macht PRD_v97_show.sql rückgängig. ACHTUNG: löscht alle Show-Daten und die Rollen Regisseur/Schauspieler.
drop table if exists public.show_parts;
drop table if exists public.show_scenes;
drop table if exists public.show_acts;
drop trigger if exists profiles_show_roles_guard on public.profiles;
drop function if exists public.profiles_show_roles_guard();
drop function if exists public.set_director(uuid, boolean);
drop function if exists public.set_actor(uuid, boolean);
drop function if exists public.is_director();
drop function if exists public.is_actor();
alter table public.profiles drop column if exists is_director;
alter table public.profiles drop column if exists is_actor;
