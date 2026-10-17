-- PRD v109: Show – Akt kann als «Hinweis» gekennzeichnet werden (steht vor den Akten).
-- Musik/Video der Akte nutzen die schon vorhandenen Spalten music_*/video_* von show_acts.
-- Voraussetzung: PRD_v97_show.sql (und v98/v101 für die Medien-Spalten). Idempotent.
alter table public.show_acts add column if not exists is_hint boolean not null default false;
alter table public.show_acts add column if not exists music_name text;
alter table public.show_acts add column if not exists music_url text;
alter table public.show_acts add column if not exists video_desc text;
alter table public.show_acts add column if not exists video_url text;
alter table public.show_acts drop constraint if exists show_acts_music_url_spotify;
alter table public.show_acts add constraint show_acts_music_url_spotify
  check (music_url is null or music_url ~* '^https://(open\.spotify\.com|play\.spotify\.com|spotify\.link)/\S+$');
alter table public.show_acts drop constraint if exists show_acts_video_url_youtube;
alter table public.show_acts add constraint show_acts_video_url_youtube
  check (video_url is null or video_url ~* '^https://((www|m|music)\.youtube\.com|youtu\.be)/\S+$');
