-- FBRO PRD v90 (2026-10-08): Admin darf Teilnehmer bei Trainings und Events bearbeiten.
-- Im Supabase SQL Editor des PRD-Projekts (dpiewpccucadlrtogvhh) ausführen. Idempotent.
-- Friends & Family lesen C&C bereits über die bestehenden Policies (is_guest() ist für sie false).

drop policy if exists "event_responses_manager_write" on public.event_responses;
create policy "event_responses_manager_write" on public.event_responses
  for all to authenticated
  using (public.is_event_manager() or public.is_admin())
  with check (public.is_event_manager() or public.is_admin());

drop policy if exists "training_responses_admin_write" on public.training_responses;
create policy "training_responses_admin_write" on public.training_responses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Kontrolle
select tablename, policyname from pg_policies
where tablename in ('training_responses','event_responses') order by 1,2;
