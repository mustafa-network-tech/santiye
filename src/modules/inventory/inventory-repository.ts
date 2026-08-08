import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryMaterial,
  InventoryMovement,
  InventoryMovementType,
  InventoryUnit,
} from "@/types/inventory";

export class InventoryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listMaterials(): Promise<InventoryMaterial[]> {
    const { data, error } = await this.supabase
      .from("inventory_materials")
      .select("*")
      .order("material_name");
    if (error) throw error;
    return (data ?? []) as InventoryMaterial[];
  }

  async listMovements(limit = 100): Promise<InventoryMovement[]> {
    const { data, error } = await this.supabase
      .from("inventory_movements")
      .select(
        "*, material:inventory_materials(material_name, material_code, unit)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as InventoryMovement[];
  }

  async createMaterial(payload: {
    material_name: string;
    material_code?: string;
    unit: InventoryUnit;
    initial_quantity: number;
    notes?: string;
  }): Promise<InventoryMaterial> {
    const { data, error } = await this.supabase.rpc(
      "create_inventory_material",
      {
        p_material_name: payload.material_name,
        p_material_code: payload.material_code || null,
        p_unit: payload.unit,
        p_initial_quantity: payload.initial_quantity,
        p_notes: payload.notes || null,
      }
    );
    if (error) throw error;
    return data as InventoryMaterial;
  }

  async recordMovement(payload: {
    material_id: string;
    movement_type: InventoryMovementType;
    quantity: number;
    usage_location?: string;
    description?: string;
  }): Promise<InventoryMaterial> {
    const { data, error } = await this.supabase.rpc(
      "record_inventory_movement",
      {
        p_material_id: payload.material_id,
        p_movement_type: payload.movement_type,
        p_quantity: payload.quantity,
        p_usage_location: payload.usage_location || null,
        p_description: payload.description || null,
      }
    );
    if (error) throw error;
    return data as InventoryMaterial;
  }
}
