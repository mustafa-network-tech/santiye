import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CUSTOM_PROJECT_TYPE_KEYS,
  DEFAULT_CUSTOM_PROJECT_TYPES,
  FIXED_PROJECT_TYPES,
  type CustomProjectTypeKey,
} from "@/lib/constants/project";
import type { CustomProjectTypes } from "@/types/project";

export class SettingsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getCustomProjectTypes(): Promise<CustomProjectTypes> {
    const { data, error } = await this.supabase
      .from("app_settings")
      .select("value")
      .eq("key", "custom_project_types")
      .maybeSingle();

    if (error) throw error;

    const value = (data?.value ?? {}) as Partial<CustomProjectTypes>;
    return {
      ...DEFAULT_CUSTOM_PROJECT_TYPES,
      ...value,
    };
  }

  async updateCustomProjectTypes(
    types: CustomProjectTypes,
    userId: string
  ): Promise<CustomProjectTypes> {
    const payload: CustomProjectTypes = {
      custom_1: types.custom_1.trim(),
      custom_2: types.custom_2.trim(),
      custom_3: types.custom_3.trim(),
      custom_4: types.custom_4.trim(),
    };

    const { data, error } = await this.supabase
      .from("app_settings")
      .upsert(
        {
          key: "custom_project_types",
          value: payload,
          updated_by: userId,
        },
        { onConflict: "key" }
      )
      .select("value")
      .single();

    if (error) throw error;
    return {
      ...DEFAULT_CUSTOM_PROJECT_TYPES,
      ...(data.value as CustomProjectTypes),
    };
  }

  async getAllProjectTypeOptions(): Promise<{ key: string; label: string }[]> {
    const custom = await this.getCustomProjectTypes();
    const customOptions = CUSTOM_PROJECT_TYPE_KEYS.map((key) => ({
      key,
      label: custom[key as CustomProjectTypeKey],
    }));

    return [...FIXED_PROJECT_TYPES.map((t) => ({ ...t })), ...customOptions];
  }

  resolveTypeLabel(
    key: string,
    custom: CustomProjectTypes
  ): string {
    const fixed = FIXED_PROJECT_TYPES.find((t) => t.key === key);
    if (fixed) return fixed.label;
    if (key in custom) return custom[key as CustomProjectTypeKey];
    return key;
  }
}
