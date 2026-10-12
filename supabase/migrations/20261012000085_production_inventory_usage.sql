-- İmalatta kullanılan stok malzemesini projeye bağlar ve stok hareketini atomik yönetir.
alter table public.production_items
  add column if not exists inventory_material_id uuid references public.inventory_materials(id) on delete set null,
  add column if not exists inventory_material_name_snapshot text,
  add column if not exists inventory_material_code_snapshot text,
  add column if not exists inventory_quantity numeric(14, 3),
  add column if not exists inventory_unit_snapshot public.inventory_unit,
  add column if not exists inventory_source_location text,
  add column if not exists inventory_movement_id uuid references public.inventory_movements(id) on delete set null;

alter table public.production_items
  drop constraint if exists production_inventory_quantity_positive;
alter table public.production_items
  add constraint production_inventory_quantity_positive
    check (inventory_quantity is null or inventory_quantity > 0);

alter table public.production_items
  drop constraint if exists production_inventory_source_location_check;
alter table public.production_items
  add constraint production_inventory_source_location_check
    check (inventory_source_location is null or inventory_source_location in ('center', 'biga'));

alter table public.production_items
  drop constraint if exists production_inventory_fields_consistent;
alter table public.production_items
  add constraint production_inventory_fields_consistent check (
    (inventory_quantity is null and inventory_unit_snapshot is null and inventory_source_location is null)
    or
    (inventory_quantity is not null and inventory_unit_snapshot is not null and inventory_source_location is not null)
  );

alter table public.inventory_movements
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists production_item_id uuid references public.production_items(id) on delete set null;

create index if not exists idx_production_items_inventory_material
  on public.production_items(inventory_material_id)
  where inventory_material_id is not null;

create unique index if not exists idx_production_items_inventory_movement
  on public.production_items(inventory_movement_id)
  where inventory_movement_id is not null;

create index if not exists idx_inventory_movements_project
  on public.inventory_movements(project_id)
  where project_id is not null;

create unique index if not exists idx_inventory_movements_production_item
  on public.inventory_movements(production_item_id)
  where production_item_id is not null;

create or replace function public.restore_production_inventory_for_entry(p_entry_id uuid)
returns void
language plpgsql security definer
set search_path = public set row_security = off
as $$
declare
  v_usage record;
begin
  for v_usage in
    select movement.id, movement.material_id, movement.quantity, movement.source_location
    from public.production_jobs job
    join public.production_items item on item.production_job_id = job.id
    join public.inventory_movements movement on movement.id = item.inventory_movement_id
    where job.production_entry_id = p_entry_id
    for update of movement
  loop
    perform 1 from public.inventory_materials where id = v_usage.material_id for update;
    if not found then
      raise exception 'İmalata bağlı stok malzemesi bulunamadı';
    end if;

    if coalesce(v_usage.source_location, 'center') = 'biga' then
      update public.inventory_materials
      set biga_stock_quantity = biga_stock_quantity + v_usage.quantity,
          updated_by = auth.uid()
      where id = v_usage.material_id;
    else
      update public.inventory_materials
      set stock_quantity = stock_quantity + v_usage.quantity,
          updated_by = auth.uid()
      where id = v_usage.material_id;
    end if;

    delete from public.inventory_movements where id = v_usage.id;
  end loop;
end;
$$;

revoke all on function public.restore_production_inventory_for_entry(uuid) from public, anon, authenticated;

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
  v_inventory_material public.inventory_materials;
  v_inventory_material_id uuid;
  v_inventory_quantity numeric(14, 3);
  v_inventory_source_location text;
  v_inventory_balance numeric(14, 3);
  v_production_item_id uuid;
  v_inventory_movement_id uuid;
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
  if p_jobs is null or jsonb_typeof(p_jobs) <> 'array' or jsonb_array_length(p_jobs) = 0 then
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

  perform public.restore_production_inventory_for_entry(v_entry_id);
  delete from public.production_jobs where production_entry_id = v_entry_id;

  for v_job in select value from jsonb_array_elements(p_jobs) loop
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

    for v_item in select value from jsonb_array_elements(coalesce(v_job->'items', '[]'::jsonb)) loop
      v_item_name := trim(coalesce(v_item->>'item_name', ''));
      v_unit := upper(trim(coalesce(v_item->>'unit', '')));
      if char_length(v_item_name) < 2 or char_length(v_unit) < 1 then
        raise exception 'İmalat adı ve birim zorunlu';
      end if;

      v_inventory_material_id := nullif(v_item->>'inventory_material_id', '')::uuid;
      v_inventory_quantity := nullif(v_item->>'inventory_quantity', '')::numeric;
      v_inventory_source_location := nullif(v_item->>'inventory_source_location', '');

      if v_inventory_material_id is null then
        if v_inventory_quantity is not null or v_inventory_source_location is not null then
          raise exception 'Malzeme miktarı için stok malzemesi seçilmelidir';
        end if;
        v_inventory_material := null;
      else
        if v_project_id is null then
          raise exception 'Stok malzemesi kullanılan imalat kayıtlı bir Proje ID''sine bağlanmalıdır';
        end if;
        if v_inventory_quantity is null or v_inventory_quantity <= 0 then
          raise exception 'Malzeme kullanım miktarı sıfırdan büyük olmalıdır';
        end if;
        v_inventory_source_location := coalesce(v_inventory_source_location, 'center');
        if v_inventory_source_location not in ('center', 'biga') then
          raise exception 'Geçersiz stok konumu';
        end if;

        select * into v_inventory_material
        from public.inventory_materials
        where id = v_inventory_material_id and material_category = 'stock'
        for update;
        if not found then raise exception 'Seçilen stok malzemesi bulunamadı'; end if;
        if v_inventory_material.unit = 'piece' and v_inventory_quantity <> trunc(v_inventory_quantity) then
          raise exception '% için adet miktarı tam sayı olmalıdır', v_inventory_material.material_name;
        end if;

        if v_inventory_source_location = 'biga' then
          if v_inventory_material.biga_stock_quantity < v_inventory_quantity then
            raise exception '% için Biga Şube stoku yetersiz. Mevcut: %', v_inventory_material.material_name, v_inventory_material.biga_stock_quantity;
          end if;
          update public.inventory_materials
          set biga_stock_quantity = biga_stock_quantity - v_inventory_quantity,
              updated_by = auth.uid()
          where id = v_inventory_material_id
          returning * into v_inventory_material;
          v_inventory_balance := v_inventory_material.biga_stock_quantity;
        else
          if v_inventory_material.stock_quantity < v_inventory_quantity then
            raise exception '% için Merkez Şantiye stoku yetersiz. Mevcut: %', v_inventory_material.material_name, v_inventory_material.stock_quantity;
          end if;
          update public.inventory_materials
          set stock_quantity = stock_quantity - v_inventory_quantity,
              updated_by = auth.uid()
          where id = v_inventory_material_id
          returning * into v_inventory_material;
          v_inventory_balance := v_inventory_material.stock_quantity;
        end if;
      end if;

      insert into public.production_items(
        production_job_id, production_item_definition_id, item_name_snapshot,
        quantity, unit_snapshot, sort_order, inventory_material_id,
        inventory_material_name_snapshot, inventory_material_code_snapshot,
        inventory_quantity, inventory_unit_snapshot, inventory_source_location
      ) values (
        v_job_id, null, v_item_name, (v_item->>'quantity')::numeric,
        v_unit, coalesce((v_item->>'sort_order')::int, 0), v_inventory_material_id,
        case when v_inventory_material_id is null then null else v_inventory_material.material_name end,
        case when v_inventory_material_id is null then null else v_inventory_material.material_code end,
        v_inventory_quantity,
        case when v_inventory_material_id is null then null else v_inventory_material.unit end,
        v_inventory_source_location
      ) returning id into v_production_item_id;

      if v_inventory_material_id is not null then
        insert into public.inventory_movements(
          material_id, movement_type, quantity, usage_location, description,
          balance_after, created_by, action_type, source_location,
          project_name, project_code, project_id,
          team_personnel_ids, team_personnel_names, production_item_id
        ) values (
          v_inventory_material_id, 'out', v_inventory_quantity, v_project.name,
          'Günlük imalat: ' || v_item_name, v_inventory_balance, auth.uid(),
          'usage', v_inventory_source_location, v_project.name, v_project.project_code,
          v_project_id, array[p_team_leader_personnel_id], array[trim(p_team_leader_name)],
          v_production_item_id
        ) returning id into v_inventory_movement_id;

        update public.production_items
        set inventory_movement_id = v_inventory_movement_id
        where id = v_production_item_id;
      end if;
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

  perform public.restore_production_inventory_for_entry(p_entry_id);
  delete from public.production_entries where id = p_entry_id;

  for v_project_id in select unnest(v_project_ids) loop
    perform public.refresh_project_from_productions(v_project_id);
  end loop;
end;
$$;

create or replace function public.delete_inventory_movement(p_movement_id uuid)
returns void language plpgsql security definer set search_path=public set row_security=off
as $$
declare v_move public.inventory_movements; v_material public.inventory_materials;
begin
  if not public.has_module_write_permission('inventory') then raise exception 'Stok hareketi silme yetkisi gerekli' using errcode='42501'; end if;
  select * into v_move from public.inventory_movements where id=p_movement_id for update;
  if not found then raise exception 'Stok hareketi bulunamadı'; end if;
  if v_move.shipment_id is not null then raise exception 'Bu hareket sevkiyat kaydına bağlıdır; sevkiyat listesinden silinmelidir'; end if;
  if v_move.production_item_id is not null then raise exception 'Bu hareket imalat kaydına bağlıdır; İmalatlar ekranından düzenlenmeli veya silinmelidir'; end if;
  select * into v_material from public.inventory_materials where id=v_move.material_id for update;
  if v_move.action_type='transfer' then
    if v_material.biga_stock_quantity<v_move.quantity then raise exception 'Bu sevkiyat silinemez; Biga stokunun bir kısmı kullanılmış'; end if;
    update public.inventory_materials set stock_quantity=stock_quantity+v_move.quantity,biga_stock_quantity=biga_stock_quantity-v_move.quantity,updated_by=auth.uid() where id=v_move.material_id;
  elsif v_move.action_type='usage' then
    if coalesce(v_move.source_location,'center')='biga' then update public.inventory_materials set biga_stock_quantity=biga_stock_quantity+v_move.quantity,updated_by=auth.uid() where id=v_move.material_id;
    else update public.inventory_materials set stock_quantity=stock_quantity+v_move.quantity,updated_by=auth.uid() where id=v_move.material_id; end if;
  else
    if coalesce(v_move.target_location,'center')='biga' then
      if v_material.biga_stock_quantity<v_move.quantity then raise exception 'Bu giriş silinemez; stokun bir kısmı kullanılmış'; end if;
      update public.inventory_materials set biga_stock_quantity=biga_stock_quantity-v_move.quantity,updated_by=auth.uid() where id=v_move.material_id;
    else
      if v_material.stock_quantity<v_move.quantity then raise exception 'Bu giriş silinemez; stokun bir kısmı kullanılmış veya sevk edilmiş'; end if;
      update public.inventory_materials set stock_quantity=stock_quantity-v_move.quantity,updated_by=auth.uid() where id=v_move.material_id;
    end if;
  end if;
  delete from public.inventory_movements where id=p_movement_id;
end;
$$;

revoke all on function public.save_production_entry(uuid,date,uuid,text,uuid,jsonb) from public;
revoke all on function public.delete_production_entry(uuid) from public;
revoke all on function public.delete_inventory_movement(uuid) from public;
grant execute on function public.save_production_entry(uuid,date,uuid,text,uuid,jsonb) to authenticated;
grant execute on function public.delete_production_entry(uuid) to authenticated;
grant execute on function public.delete_inventory_movement(uuid) to authenticated;
