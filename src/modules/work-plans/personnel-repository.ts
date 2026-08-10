import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Personnel,
  PersonnelInsert,
  PersonnelUpdate,
} from "@/types/work-plan";

function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  return value.trim();
}

export class PersonnelRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getById(id: string): Promise<Personnel | null> {
    const { data, error } = await this.supabase
      .from("personnel")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as Personnel | null;
  }

  async list(options?: {
    activeOnly?: boolean;
    search?: string;
  }): Promise<Personnel[]> {
    let query = this.supabase
      .from("personnel")
      .select("*")
      .order("full_name", { ascending: true });

    if (options?.activeOnly) {
      query = query.eq("is_active", true);
    }

    if (options?.search?.trim()) {
      const term = options.search.trim().replace(/[%_]/g, "\\$&");
      query = query.or(
        `full_name.ilike.%${term}%,job_title.ilike.%${term}%,phone.ilike.%${term}%,tc_identity_number.ilike.%${term}%,notes.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Personnel[];
  }

  async create(payload: PersonnelInsert): Promise<Personnel> {
    const { data, error } = await this.supabase
      .from("personnel")
      .insert({
        full_name: payload.full_name.trim(),
        job_title: emptyToNull(payload.job_title),
        phone: emptyToNull(payload.phone),
        tc_identity_number: emptyToNull(payload.tc_identity_number),
        is_active: payload.is_active ?? true,
        employment_start_date: emptyToNull(payload.employment_start_date),
        employment_end_date:
          payload.is_active === false
            ? emptyToNull(payload.employment_end_date)
            : null,
        monthly_salary: payload.monthly_salary ?? 0,
        notes: emptyToNull(payload.notes),
        created_by: payload.created_by ?? null,
        updated_by: payload.updated_by ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as Personnel;
  }

  async update(id: string, payload: PersonnelUpdate): Promise<Personnel> {
    const updatePayload: Record<string, unknown> = {
      updated_by: payload.updated_by ?? null,
    };

    if (payload.full_name !== undefined)
      updatePayload.full_name = payload.full_name.trim();
    if (payload.job_title !== undefined)
      updatePayload.job_title = emptyToNull(payload.job_title);
    if (payload.phone !== undefined)
      updatePayload.phone = emptyToNull(payload.phone);
    if (payload.tc_identity_number !== undefined)
      updatePayload.tc_identity_number = emptyToNull(
        payload.tc_identity_number
      );
    if (payload.is_active !== undefined)
      updatePayload.is_active = payload.is_active;
    if (payload.employment_start_date !== undefined)
      updatePayload.employment_start_date = emptyToNull(
        payload.employment_start_date
      );
    if (payload.employment_end_date !== undefined)
      updatePayload.employment_end_date =
        payload.is_active === true
          ? null
          : emptyToNull(payload.employment_end_date);
    if (payload.notes !== undefined)
      updatePayload.notes = emptyToNull(payload.notes);
    if (payload.monthly_salary !== undefined)
      updatePayload.monthly_salary = payload.monthly_salary;

    const { data, error } = await this.supabase
      .from("personnel")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data as Personnel;
  }
}
