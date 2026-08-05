import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceChange,
  MonthlyAttendanceData,
  PersonnelActivityFilter,
} from "@/types/attendance";

export class AttendanceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMonth(options: {
    year: number;
    month: number;
    activeFilter?: PersonnelActivityFilter;
    search?: string;
  }): Promise<MonthlyAttendanceData> {
    const { data, error } = await this.supabase.rpc("get_monthly_attendance", {
      p_year: options.year,
      p_month: options.month,
      p_active_filter: options.activeFilter ?? "active",
      p_search: options.search?.trim() ?? "",
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
}
