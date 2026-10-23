-- v115: Events mit Ende (Datum/Zeit) und Design pro Person (White, Blue, Petrol, Orange)
-- Im Supabase SQL Editor ausführen (idempotent), VOR dem Einspielen der App.
alter table public.events add column if not exists end_date date;
alter table public.events add column if not exists end_time time;
alter table public.profiles add column if not exists design text check (design is null or design in ('standard', 'light', 'petrol', 'holland'));
grant update (design) on public.profiles to authenticated;

-- Prüfen (3 Zeilen erwartet):
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and ((table_name = 'events' and column_name in ('end_date', 'end_time')) or (table_name = 'profiles' and column_name = 'design'));
