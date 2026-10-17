-- PRD v101: Zeile «Video» (Beschreibung + YouTube-Link) pro Akt. Im SQL Editor von PRD ausführen (idempotent).
-- Voraussetzung: PRD_v97_show.sql wurde ausgeführt.
alter table public.show_acts add column if not exists video_desc text;
alter table public.show_acts add column if not exists video_url  text;
alter table public.show_acts drop constraint if exists show_acts_video_url_youtube;
alter table public.show_acts add constraint show_acts_video_url_youtube
  check (video_url is null or video_url ~* '^https://((www|m|music)\.youtube\.com|youtu\.be)/\S+$');
