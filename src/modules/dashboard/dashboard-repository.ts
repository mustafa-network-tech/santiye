import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats, Project } from "@/types/project";

const EMPTY_STATS: DashboardStats = {
  total: 0,
  waiting: 0,
  in_progress: 0,
  excavation_permit_waiting: 0,
  delayed: 0,
  completed: 0,
  archived: 0,
};

export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getStats(): Promise<DashboardStats> {
    const { data, error } = await this.supabase.rpc("get_dashboard_stats");
    if (error) throw error;
    return { ...EMPTY_STATS, ...(data as DashboardStats) };
  }

  async getRecentlyUpdated(limit = 8): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Project[];
  }

  async getRecentlyCreated(limit = 8): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from("projects")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Project[];
  }
}
