import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  getStageDateKey,
} from "@/lib/constants/project";
import type {
  PaginatedResult,
  Project,
  ProjectFilters,
  ProjectInsert,
  ProjectTrackingUpdate,
  ProjectUpdate,
  ProjectSheet,
} from "@/types/project";

function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  return value;
}

export class ProjectRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(filters: ProjectFilters = {}): Promise<PaginatedResult<Project>> {
    const { error: refreshError } = await this.supabase.rpc(
      "refresh_overdue_project_statuses"
    );
    if (refreshError && refreshError.code !== "PGRST202") throw refreshError;

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sortBy = filters.sortBy ?? "updated_at";
    const ascending = (filters.sortOrder ?? "desc") === "asc";

    let query = this.supabase.from("projects").select("*", { count: "exact" });

    const scope = filters.archiveScope ?? "active";
    if (scope === "active") {
      query = query.eq("is_archived", false);
    } else if (scope === "archived") {
      query = query.eq("is_archived", true);
    }

    if (filters.analysisStage) {
      switch (filters.analysisStage) {
        case "not_started":
          query = query.eq("status", "waiting");
          break;
        case "completed":
          query = query.eq("status", "completed");
          break;
        case "delayed":
          query = query.eq("status", "delayed");
          break;
        case "excavation_waiting":
          query = query
            .eq("tracks_excavation", true)
            .not("excavation_done", "is", true);
          break;
        case "obk_waiting":
          query = query
            .eq("status", "in_progress")
            .eq("tracks_obk", true)
            .not("obk_pulled", "is", true)
            .or("tracks_excavation.eq.false,excavation_done.eq.true");
          break;
        case "cable_waiting":
          query = query
            .eq("status", "in_progress")
            .eq("cable_pulled", false)
            .or("tracks_obk.eq.false,obk_pulled.eq.true")
            .or("tracks_excavation.eq.false,excavation_done.eq.true");
          break;
        case "in_progress":
          query = query
            .eq("status", "in_progress")
            .not("cable_pulled", "is", false)
            .or("tracks_obk.eq.false,obk_pulled.eq.true")
            .or("tracks_excavation.eq.false,excavation_done.eq.true");
          break;
      }
    } else if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.projectType && filters.projectType !== "all") {
      query = query.eq("project_type", filters.projectType);
    }

    if (filters.location && filters.location !== "all") {
      query = query.eq("location", filters.location);
    }

    const applyTrackingFilter = (
      filter: ProjectFilters["obkStatus"],
      tracksField: string,
      resultField: string
    ) => {
      if (!filter || filter === "all") return;
      if (filter === "tracked") query = query.eq(tracksField, true);
      else if (filter === "untracked") query = query.eq(tracksField, false);
      else {
        query = query
          .eq(tracksField, true)
          .eq(resultField, filter === "true");
      }
    };

    applyTrackingFilter(filters.obkStatus, "tracks_obk", "obk_pulled");
    applyTrackingFilter(filters.jointStatus, "tracks_joint", "joint_done");
    applyTrackingFilter(filters.cableStatus, "tracks_cable", "cable_pulled");
    applyTrackingFilter(
      filters.excavationStatus,
      "tracks_excavation",
      "excavation_done"
    );

    if (filters.search?.trim()) {
      const term = filters.search.trim().replace(/[%_]/g, "\\$&");
      query = query.or(
        [
          `project_code.ilike.%${term}%`,
          `name.ilike.%${term}%`,
          `location.ilike.%${term}%`,
          `description.ilike.%${term}%`,
          `progress_notes.ilike.%${term}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;

    return {
      data: (data ?? []) as Project[],
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Project | null;
  }

  async create(payload: ProjectInsert): Promise<Project> {
    const receivedAt =
      emptyToNull(payload.received_at) ??
      new Date().toISOString().slice(0, 10);

    const insertPayload: Record<string, unknown> = {
      project_code: payload.project_code.trim(),
      name: payload.name.trim(),
      project_type: payload.project_type,
      location: payload.location.trim(),
      description: emptyToNull(payload.description),
      status: "waiting",
      received_at: receivedAt,
      waiting_at: receivedAt,
      tracks_obk: payload.tracks_obk ?? false,
      sheet_count: payload.sheet_count ?? null,
      hp_count: payload.hp_count ?? null,
      is_single_sheet: payload.is_single_sheet ?? false,
      created_by: payload.created_by ?? null,
      updated_by: payload.updated_by ?? null,
    };

    const { data, error } = await this.supabase
      .from("projects")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw error;
    if (payload.is_single_sheet) {
      const { error: sheetError } = await this.supabase.from("project_sheets").insert({
        project_id: data.id, name: "Tek Pafta", hp_count: payload.hp_count ?? null,
        tracks_obk: payload.tracks_obk ?? false, created_by: payload.created_by ?? null,
      });
      if (sheetError) throw sheetError;
    }
    return data as Project;
  }

  async getSheets(projectId: string): Promise<ProjectSheet[]> {
    const { data, error } = await this.supabase.from("project_sheets")
      .select("*, cables:project_sheet_cables(*), progress:project_sheet_progress(*)")
      .eq("project_id", projectId).order("created_at");
    if (error) throw error;
    return (data ?? []) as ProjectSheet[];
  }

  async update(id: string, payload: ProjectUpdate): Promise<Project> {
    const updatePayload: Record<string, unknown> = {
      updated_by: payload.updated_by ?? null,
    };

    if (payload.project_code !== undefined)
      updatePayload.project_code = payload.project_code.trim();
    if (payload.name !== undefined) updatePayload.name = payload.name.trim();
    if (payload.project_type !== undefined)
      updatePayload.project_type = payload.project_type;
    if (payload.location !== undefined)
      updatePayload.location = payload.location.trim();
    if (payload.description !== undefined)
      updatePayload.description = emptyToNull(payload.description);
    if (payload.received_at !== undefined)
      updatePayload.received_at = emptyToNull(payload.received_at);
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.waiting_at !== undefined)
      updatePayload.waiting_at = emptyToNull(payload.waiting_at);
    if (payload.in_progress_at !== undefined)
      updatePayload.in_progress_at = emptyToNull(payload.in_progress_at);
    if (payload.excavation_permit_waiting_at !== undefined)
      updatePayload.excavation_permit_waiting_at = emptyToNull(
        payload.excavation_permit_waiting_at
      );
    if (payload.delayed_at !== undefined)
      updatePayload.delayed_at = emptyToNull(payload.delayed_at);
    if (payload.completed_at !== undefined)
      updatePayload.completed_at = emptyToNull(payload.completed_at);
    if (payload.cable_pulled !== undefined)
      updatePayload.cable_pulled = payload.cable_pulled;
    if (payload.tracks_obk !== undefined)
      updatePayload.tracks_obk = payload.tracks_obk;
    if (payload.obk_pulled !== undefined)
      updatePayload.obk_pulled = payload.obk_pulled;
    if (payload.tracks_joint !== undefined)
      updatePayload.tracks_joint = payload.tracks_joint;
    if (payload.joint_done !== undefined)
      updatePayload.joint_done = payload.joint_done;
    if (payload.tracks_cable !== undefined)
      updatePayload.tracks_cable = payload.tracks_cable;
    if (payload.tracks_excavation !== undefined)
      updatePayload.tracks_excavation = payload.tracks_excavation;
    if (payload.excavation_done !== undefined)
      updatePayload.excavation_done = payload.excavation_done;
    if (payload.progress_notes !== undefined)
      updatePayload.progress_notes = emptyToNull(payload.progress_notes);
    if (payload.is_archived !== undefined)
      updatePayload.is_archived = payload.is_archived;
    if (payload.archived_at !== undefined)
      updatePayload.archived_at = payload.archived_at;

    const { data, error } = await this.supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as Project;
  }

  async updateWithStageDate(
    id: string,
    payload: ProjectUpdate & { stage_date?: string | null }
  ): Promise<Project> {
    const { stage_date, ...rest } = payload;

    if (rest.status && stage_date !== undefined) {
      const key = getStageDateKey(rest.status);
      return this.update(id, {
        ...rest,
        [key]: emptyToNull(stage_date),
      });
    }

    return this.update(id, rest);
  }

  async bulkUpdateTracking(
    updates: ProjectTrackingUpdate[]
  ): Promise<Project[]> {
    if (updates.length === 0) return [];

    const { data, error } = await this.supabase.rpc(
      "bulk_update_project_tracking",
      { p_updates: updates }
    );

    if (error) throw error;
    return (data ?? []) as Project[];
  }

  async reactivate(id: string, userId: string): Promise<Project> {
    return this.updateWithStageDate(id, {
      is_archived: false,
      archived_at: null,
      status: "in_progress",
      tracks_joint: true,
      joint_done: false,
      completed_at: null,
      stage_date: new Date().toISOString().slice(0, 10),
      updated_by: userId,
    });
  }

  async getLocationSuggestions(query = "", limit = 20): Promise<string[]> {
    const { data, error } = await this.supabase.rpc("get_location_suggestions", {
      p_query: query,
      p_limit: limit,
    });

    if (error) throw error;
    return ((data as { value: string }[] | null) ?? []).map((r) => r.value);
  }

  async getDistinctLocations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("location")
      .order("location");

    if (error) throw error;
    return [...new Set((data ?? []).map((r) => r.location as string))];
  }
}
