-- FBRO PRD: Rollen-Änderung rückgängig machen (Admin hat wieder alle Manager-Rechte)
-- Im Supabase SQL Editor des PRD-Projekts (dpiewpccucadlrtogvhh) ausführen. Idempotent.
-- Dazu passend die vorherige App-Version einspielen (ZIP der vorherigen Version).

create or replace function public.can_cc()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or public.is_chilbi_manager() or public.is_chraenzli_manager()
$$;

create or replace function public.can_jass()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or public.is_jass_master()
$$;

drop policy if exists "events_manage_write" on public.events;
create policy "events_manage_write" on public.events
  for all to authenticated
  using (public.is_admin() or public.is_event_manager())
  with check (public.is_admin() or public.is_event_manager());

drop policy if exists "event_responses_manager_write" on public.event_responses;
create policy "event_responses_manager_write" on public.event_responses
  for all to authenticated
  using (public.is_admin() or public.is_event_manager())
  with check (public.is_admin() or public.is_event_manager());
