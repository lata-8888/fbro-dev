alter table public.show_scenes drop constraint if exists show_scenes_music_url_spotify;
alter table public.show_scenes drop constraint if exists show_scenes_video_url_youtube;
alter table public.show_scenes drop column if exists music_name;
alter table public.show_scenes drop column if exists music_url;
alter table public.show_scenes drop column if exists video_desc;
alter table public.show_scenes drop column if exists video_url;
