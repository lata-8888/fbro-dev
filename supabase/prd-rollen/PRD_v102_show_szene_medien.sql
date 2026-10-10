-- PRD v102: Musik (Name + Spotify-Link) und Video (Beschreibung + YouTube-Link) gehören jetzt zur SZENE statt zum Akt.
-- Im SQL Editor von PRD ausführen (idempotent). Voraussetzung: PRD_v97_show.sql.
-- Die Spalten music_*/video_* am Akt (aus v98/v101) bleiben bestehen, werden von der App aber nicht mehr angezeigt.
alter table public.show_scenes add column if not exists music_name text;
alter table public.show_scenes add column if not exists music_url  text;
alter table public.show_scenes add column if not exists video_desc text;
alter table public.show_scenes add column if not exists video_url  text;
alter table public.show_scenes drop constraint if exists show_scenes_music_url_spotify;
alter table public.show_scenes add constraint show_scenes_music_url_spotify
  check (music_url is null or music_url ~* '^https://(open\.spotify\.com|play\.spotify\.com|spotify\.link)/\S+$');
alter table public.show_scenes drop constraint if exists show_scenes_video_url_youtube;
alter table public.show_scenes add constraint show_scenes_video_url_youtube
  check (video_url is null or video_url ~* '^https://((www|m|music)\.youtube\.com|youtu\.be)/\S+$');
