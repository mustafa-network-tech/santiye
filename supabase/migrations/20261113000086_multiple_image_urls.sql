alter table public.projects
  add column if not exists image_urls text[] not null default '{}';
alter table public.project_sheets
  add column if not exists image_urls text[] not null default '{}';

update public.projects
  set image_urls = array[image_url]
  where image_url is not null and btrim(image_url) <> '' and image_urls = '{}';
update public.project_sheets
  set image_urls = array[image_url]
  where image_url is not null and btrim(image_url) <> '' and image_urls = '{}';
