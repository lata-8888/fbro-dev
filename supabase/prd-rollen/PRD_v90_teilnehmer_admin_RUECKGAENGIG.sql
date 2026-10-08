drop policy if exists "training_responses_admin_write" on public.training_responses;
drop policy if exists "event_responses_manager_write" on public.event_responses;
create policy "event_responses_manager_write" on public.event_responses
  for all to authenticated using (public.is_event_manager()) with check (public.is_event_manager());
