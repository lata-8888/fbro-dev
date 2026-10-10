alter table public.show_acts drop constraint if exists show_acts_music_url_spotify;
alter table public.show_acts drop column if exists music_url;
alter table public.show_acts drop column if exists music_name;
