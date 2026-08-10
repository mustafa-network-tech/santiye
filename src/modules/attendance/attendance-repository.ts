import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceChange,
  AttendanceMonthArchive,
  AttendanceStatus,
  MonthlyAttendanceData,
  PersonnelAttendanceDetail,
  PersonnelAttendanceSummary,
  PersonnelActivityFilter,
  PersonnelListSummary,
} from "@/types/attendance";

export class AttendanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async ensureSundays(year: number, month: number): Promise<void> {
    const { error } = await this.supabase.rpc(
      "ensure_sunday_attendance_for_month",
      { p_year: year, p_month: month }
    );
    if (error) throw error;
  }

  async getMonth(options: {
    year: number;
    month: number;
    activeFilter?: PersonnelActivityFilter;
    search?: string;
    statusFilter?: AttendanceStatus | "all";
  }): Promise<MonthlyAttendanceData> {
    const { data, error } = await this.supabase.rpc("get_monthly_attendance", {
      p_year: options.year,
      p_month: options.month,
      p_active_filter: options.activeFilter ?? "active",
      p_search: options.search?.trim() ?? "",
      p_status_filter: options.statusFilter ?? "all",
    });

    if (error) throw error;
    return data as MonthlyAttendanceData;
  }

  async saveChanges(
    changes: AttendanceChange[]
  ): Promise<{ saved: number; deleted: number }> {
    if (changes.length === 0) return { saved: 0, deleted: 0 };

    const { data, error } = await this.supabase.rpc(
      "save_attendance_changes",
      { p_changes: changes }
    );

    if (error) throw error;
    return data as { saved: number; deleted: number };
  }

  async getPersonnelSummary(
    personnelId: string,
    year: number,
    month: number
  ): Promise<PersonnelAttendanceSummary | null> {
    const { data, error } = await this.supabase.rpc(
      "get_personnel_attendance_summary",
      {
        p_personnel_id: personnelId,
        p_year: year,
        p_month: month,
      }
    );

    if (error) throw error;
    return (data as PersonnelAttendanceSummary | null) ?? null;
  }

  async getMonthArchives(): Promise<AttendanceMonthArchive[]> {
    const { data, error } = await this.supabase.rpc(
      "get_attendance_month_archives"
    );
    if (error) throw error;
    return (data ?? []) as AttendanceMonthArchive[];
  }

  async getPersonnelListSummaries(
    year: number,
    month: number
  ): Promise<PersonnelListSummary[]> {
    const { data, error } = await this.supabase.rpc(
      "get_personnel_list_summaries",
      { p_year: year, p_month: month }
    );
    if (error) throw error;
    return (data ?? []) as PersonnelListSummary[];
  }

  async getPersonnelDetail(
    personnelId: string,
    year: number,
    month: number
  ): Promise<PersonnelAttendanceDetail | null> {
    const { data, error } = await this.supabase.rpc(
      "get_personnel_attendance_detail",
      {
        p_personnel_id: personnelId,
        p_year: year,
        p_month: month,
      }
    );
    if (error) throw error;
    return (data as PersonnelAttendanceDetail | null) ?? null;
  }
}
