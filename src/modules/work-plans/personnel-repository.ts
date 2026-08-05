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
        `full_name.ilike.%${term}%,phone.ilike.%${term}%,notes.ilike.%${term}%`
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
        phone: emptyToNull(payload.phone),
        is_active: payload.is_active ?? true,
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
    if (payload.phone !== undefined)
      updatePayload.phone = emptyToNull(payload.phone);
    if (payload.is_active !== undefined)
      updatePayload.is_active = payload.is_active;
    if (payload.notes !== undefined)
      updatePayload.notes = emptyToNull(payload.notes);

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
