-- FBRO PRD: Rollen stringenter fassen (Stand 2026-10-08)
-- Der Admin hat KEINE automatischen Rechte mehr für Events, Chilbi/Chränzli (C&C) und Jass.
-- Er kann sich diese Rollen selbst zuteilen (Admin → Rollen → Person → «Zum … machen»).
-- Im Supabase SQL Editor des PRD-Projekts (dpiewpccucadlrtogvhh) ausführen. Idempotent.
-- Rückgängig: PRD_rollen_strikt_RUECKGAENGIG.sql

create or replace function public.can_cc()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_chilbi_manager() or public.is_chraenzli_manager()
$$;

create or replace function public.can_jass()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_jass_master()
$$;

drop policy if exists "events_manage_write" on public.events;
create policy "events_manage_write" on public.events
  for all to authenticated
  using (public.is_event_manager())
  with check (public.is_event_manager());

drop policy if exists "event_responses_manager_write" on public.event_responses;
create policy "event_responses_manager_write" on public.event_responses
  for all to authenticated
  using (public.is_event_manager())
  with check (public.is_event_manager());

-- Kontrolle: wer hat welche Rolle? (Admin ohne Rolle verliert die Rechte sofort)
select name, is_admin, is_event_manager, is_chilbi_manager, is_chraenzli_manager, is_jass_master
from public.profiles
where is_admin or is_event_manager or is_chilbi_manager or is_chraenzli_manager or is_jass_master
order by is_admin desc, name;
