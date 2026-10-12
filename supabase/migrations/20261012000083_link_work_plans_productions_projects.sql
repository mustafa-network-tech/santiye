-- İş planı -> imalat -> proje bağlantısını kalıcı hale getirir.
alter table public.daily_work_plan_teams
  add column if not exists project_id uuid null references public.projects(id) on delete set null;

create index if not exists idx_daily_work_plan_teams_project
  on public.daily_work_plan_teams(project_id)
  where project_id is not null;

create index if not exists idx_production_jobs_project
  on public.production_jobs(project_id)
  where project_id is not null;

update public.daily_work_plan_teams team
set project_id = project.id
from public.projects project
where team.project_id is null
  and trim(team.project_code) <> ''
  and team.project_code <> '-'
  and upper(trim(team.project_code)) = upper(trim(project.project_code));

update public.production_jobs job
set project_id = project.id
from public.projects project
where job.project_id is null
  and nullif(trim(job.project_code_snapshot), '') is not null
  and upper(trim(job.project_code_snapshot)) = upper(trim(project.project_code));

create or replace function public.refresh_project_from_productions(p_project_id uuid)
returns void language plpgsql security definer set search_path=public set row_security=off
as $$
declare
  v_latest record;
begin
  select entry.team_leader_personnel_id, entry.team_leader_name_snapshot, entry.work_date
  into v_latest
  from public.production_jobs job
  join public.production_entries entry on entry.id = job.production_entry_id
  where job.project_id = p_project_id
  order by entry.work_date desc, entry.updated_at desc
  limit 1;

  if found then
    update public.projects
    set status = case when status in ('waiting', 'delayed') then 'in_progress'::public.project_status else status end,
        in_progress_at = case when status in ('waiting', 'delayed') then coalesce(in_progress_at, v_latest.work_date) else in_progress_at end,
        current_team_leader_personnel_id = v_latest.team_leader_personnel_id,
        current_team_leader_name = v_latest.team_leader_name_snapshot,
        updated_at = now()
    where id = p_project_id and is_archived = false and is_cancelled = false;
  end if;
end;
$$;

revoke execute on function public.refresh_project_from_productions(uuid) from public, anon, authenticated;

create or replace function public.save_production_entry(
  p_entry_id uuid, p_work_date date, p_team_leader_personnel_id uuid,
  p_team_leader_name text, p_source_work_plan_id uuid, p_jobs jsonb
)
returns uuid language plpgsql security definer set search_path=public set row_security=off
as $$
declare
  v_entry_id uuid;
  v_job jsonb;
  v_item jsonb;
  v_job_id uuid;
  v_item_name text;
  v_unit text;
  v_project public.projects;
  v_project_id uuid;
  v_affected_projects uuid[] := '{}'::uuid[];
begin
  if not public.has_module_write_permission('productions') then
    raise exception 'İmalat yazma yetkisi gerekli' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.personnel
    where id = p_team_leader_personnel_id and is_active = true
  ) then
    raise exception 'Aktif ekip personeli bulunamadı';
  end if;
  if p_source_work_plan_id is not null and not exists (
    select 1
    from public.daily_work_plans plan
    join public.daily_work_plan_teams team on team.plan_id = plan.id
    where plan.id = p_source_work_plan_id
      and plan.plan_date = p_work_date
      and team.chief_personnel_id = p_team_leader_personnel_id
  ) then
    raise exception 'Personel seçilen tarihte kaynak iş planında ekip şefi değil';
  end if;
  if jsonb_array_length(coalesce(p_jobs, '[]'::jsonb)) = 0 then
    raise exception 'En az bir proje gerekli';
  end if;

  if p_entry_id is not null and exists (select 1 from public.production_entries where id = p_entry_id) then
    update public.production_entries set
      work_date = p_work_date,
      team_leader_personnel_id = p_team_leader_personnel_id,
      team_leader_name_snapshot = trim(p_team_leader_name),
      source_work_plan_id = p_source_work_plan_id,
      updated_by = auth.uid()
    where id = p_entry_id
    returning id into v_entry_id;
  else
    insert into public.production_entries(
      work_date, team_leader_personnel_id, team_leader_name_snapshot,
      source_work_plan_id, created_by, updated_by
    ) values (
      p_work_date, p_team_leader_personnel_id, trim(p_team_leader_name),
      p_source_work_plan_id, auth.uid(), auth.uid()
    )
    on conflict(work_date, team_leader_personnel_id) do update set
      team_leader_name_snapshot = excluded.team_leader_name_snapshot,
      source_work_plan_id = excluded.source_work_plan_id,
      updated_by = auth.uid()
    returning id into v_entry_id;
  end if;

  select coalesce(array_agg(distinct project_id), '{}'::uuid[])
  into v_affected_projects
  from public.production_jobs
  where production_entry_id = v_entry_id and project_id is not null;

  delete from public.production_jobs where production_entry_id = v_entry_id;

  for v_job in select * from jsonb_array_elements(p_jobs) loop
    v_project_id := nullif(v_job->>'project_id', '')::uuid;
    v_project := null;
    if v_project_id is not null then
      select * into v_project from public.projects where id = v_project_id;
      if not found then raise exception 'Bağlanacak proje bulunamadı'; end if;
      if v_project.is_cancelled then raise exception 'İptal edilmiş projeye imalat kaydedilemez'; end if;
      if not (v_project_id = any(v_affected_projects)) then
        v_affected_projects := array_append(v_affected_projects, v_project_id);
      end if;
    end if;

    if v_project_id is null and char_length(trim(coalesce(v_job->>'project_name', ''))) < 2 then
      raise exception 'Proje adı zorunlu';
    end if;
    if coalesce(v_job->>'source', 'manual') not in ('manual', 'work_plan') then
      raise exception 'Geçersiz imalat kaynağı';
    end if;
    if v_job->>'source' = 'work_plan' and p_source_work_plan_id is null then
      raise exception 'İş planı kaynaklı imalat için kaynak plan zorunlu';
    end if;

    insert into public.production_jobs(
      production_entry_id, project_id, project_name_snapshot,
      project_code_snapshot, source, sort_order
    ) values (
      v_entry_id,
      v_project_id,
      case when v_project_id is not null then v_project.name else trim(v_job->>'project_name') end,
      case when v_project_id is not null then v_project.project_code else nullif(trim(v_job->>'project_code'), '') end,
      coalesce(v_job->>'source', 'manual'),
      coalesce((v_job->>'sort_order')::int, 0)
    ) returning id into v_job_id;

    if jsonb_array_length(coalesce(v_job->'items', '[]'::jsonb)) = 0 then
      raise exception 'Her projede en az bir imalat gerekli';
    end if;
    for v_item in select * from jsonb_array_elements(coalesce(v_job->'items', '[]'::jsonb)) loop
      v_item_name := trim(coalesce(v_item->>'item_name', ''));
      v_unit := upper(trim(coalesce(v_item->>'unit', '')));
      if char_length(v_item_name) < 2 or char_length(v_unit) < 1 then
        raise exception 'İmalat adı ve birim zorunlu';
      end if;
      insert into public.production_items(
        production_job_id, production_item_definition_id, item_name_snapshot,
        quantity, unit_snapshot, sort_order
      ) values (
        v_job_id, null, v_item_name, (v_item->>'quantity')::numeric,
        v_unit, coalesce((v_item->>'sort_order')::int, 0)
      );
    end loop;
  end loop;

  for v_project_id in select unnest(v_affected_projects) loop
    perform public.refresh_project_from_productions(v_project_id);
  end loop;
  return v_entry_id;
end;
$$;

create or replace function public.delete_production_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path=public set row_security=off
as $$
declare
  v_project_id uuid;
  v_project_ids uuid[];
begin
  if not public.has_module_write_permission('productions') then
    raise exception 'İmalat silme yetkisi gerekli' using errcode='42501';
  end if;
  select coalesce(array_agg(distinct project_id), '{}'::uuid[])
  into v_project_ids
  from public.production_jobs
  where production_entry_id = p_entry_id and project_id is not null;
  delete from public.production_entries where id = p_entry_id;
  for v_project_id in select unnest(v_project_ids) loop
    perform public.refresh_project_from_productions(v_project_id);
  end loop;
end;
$$;

grant execute on function public.save_production_entry(uuid,date,uuid,text,uuid,jsonb) to authenticated;
grant execute on function public.delete_production_entry(uuid) to authenticated;
