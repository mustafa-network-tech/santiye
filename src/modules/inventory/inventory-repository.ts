import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryMaterial,
  InventoryCustodyBalance,
  InventoryCustodyMovement,
  CustodyLocationType,
  CustodyTeamOption,
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

  async listCustodyBalances(): Promise<InventoryCustodyBalance[]> {
    const { data, error } = await this.supabase
      .from("inventory_custody_balances")
      .select(
        "*, material:inventory_materials(material_name, material_code, unit)"
      )
      .order("holder_name");
    if (error) throw error;
    return (data ?? []) as InventoryCustodyBalance[];
  }

  async listPersonnelCustodyBalances(
    personnelId: string
  ): Promise<InventoryCustodyBalance[]> {
    const { data, error } = await this.supabase
      .from("inventory_custody_balances")
      .select(
        "*, material:inventory_materials(material_name, material_code, unit)"
      )
      .eq("holder_type", "personnel")
      .eq("holder_id", personnelId)
      .gt("quantity", 0)
      .order("holder_name");
    if (error) throw error;
    return (data ?? []) as InventoryCustodyBalance[];
  }

  async listCustodyMovements(limit = 100): Promise<
    InventoryCustodyMovement[]
  > {
    const { data, error } = await this.supabase
      .from("inventory_custody_movements")
      .select(
        "*, material:inventory_materials(material_name, material_code, unit)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as InventoryCustodyMovement[];
  }

  async listTeamOptions(): Promise<CustodyTeamOption[]> {
    const { data, error } = await this.supabase
      .from("daily_work_plan_teams")
      .select(
        "id, team_type, project_name, chief_name, plan:daily_work_plans(plan_date)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((team) => {
      const plan = team.plan as unknown as { plan_date?: string } | null;
      return {
        id: team.id as string,
        label: `${team.team_type} · ${team.project_name} · ${team.chief_name}${
          plan?.plan_date ? ` · ${plan.plan_date}` : ""
        }`,
      };
    });
  }

  async transferCustody(payload: {
    material_id: string;
    quantity: number;
    from_type: CustodyLocationType;
    from_id: string | null;
    to_type: CustodyLocationType;
    to_id: string | null;
    notes?: string;
  }): Promise<void> {
    const { error } = await this.supabase.rpc("transfer_inventory_custody", {
      p_material_id: payload.material_id,
      p_quantity: payload.quantity,
      p_from_type: payload.from_type,
      p_from_id: payload.from_id,
      p_to_type: payload.to_type,
      p_to_id: payload.to_id,
      p_notes: payload.notes || null,
    });
    if (error) throw error;
  }
}
