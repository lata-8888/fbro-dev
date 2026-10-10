alter table public.show_acts drop constraint if exists show_acts_video_url_youtube;
alter table public.show_acts drop column if exists video_url;
alter table public.show_acts drop column if exists video_desc;
