alter table public.show_scenes drop constraint if exists show_scenes_video_url_youtube;
alter table public.show_scenes add constraint show_scenes_video_url_youtube check (video_url is null or video_url ~* '^https://((www|m|music)\.youtube\.com|youtu\.be)/\S+$');
alter table public.show_acts drop constraint if exists show_acts_video_url_youtube;
alter table public.show_acts add constraint show_acts_video_url_youtube check (video_url is null or video_url ~* '^https://((www|m|music)\.youtube\.com|youtu\.be)/\S+$');
