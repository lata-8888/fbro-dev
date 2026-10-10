-- PRD v98: Feld «Musik» (Name + Spotify-Link) pro Akt. Im SQL Editor von PRD ausführen (idempotent).
-- Voraussetzung: PRD_v97_show.sql wurde ausgeführt.
alter table public.show_acts add column if not exists music_name text;
alter table public.show_acts add column if not exists music_url  text;
alter table public.show_acts drop constraint if exists show_acts_music_url_spotify;
alter table public.show_acts add constraint show_acts_music_url_spotify
  check (music_url is null or music_url ~* '^https://(open\.spotify\.com|play\.spotify\.com|spotify\.link)/\S+$');
