-- Personelin iş planı seçim listelerinde gösterilip gösterilmeyeceğini yönetir.
-- Mevcut çalışma düzenini korumak için mevcut ve yeni personelde varsayılan açıktır.
alter table public.personnel
  add column if not exists include_in_work_plan boolean not null default true;

comment on column public.personnel.include_in_work_plan is
  'false olduğunda personel aktif olsa bile yeni iş planı ekip ve izin listelerinde gösterilmez';

create index if not exists idx_personnel_work_plan_visible
  on public.personnel(full_name)
  where is_active = true and include_in_work_plan = true;
