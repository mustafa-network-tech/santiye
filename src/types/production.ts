import type { InventoryLocation, InventoryUnit } from "@/types/inventory";

export type ProductionDefinition = { id: string; name: string; unit: string; is_active: boolean; created_at: string; updated_at: string };
export type ProductionItem = {
  id: string;
  production_item_definition_id: string | null;
  item_name_snapshot: string;
  quantity: number;
  unit_snapshot: string;
  sort_order: number;
  inventory_material_id: string | null;
  inventory_material_name_snapshot: string | null;
  inventory_material_code_snapshot: string | null;
  inventory_quantity: number | null;
  inventory_unit_snapshot: InventoryUnit | null;
  inventory_source_location: InventoryLocation | null;
  inventory_movement_id: string | null;
};
export type ProductionJob = { id: string; project_id: string | null; project_name_snapshot: string; project_code_snapshot: string | null; source: "work_plan" | "manual"; sort_order: number; items: ProductionItem[] };
export type ProductionEntry = { id: string; work_date: string; team_leader_personnel_id: string; team_leader_name_snapshot: string; source_work_plan_id: string | null; created_at: string; updated_at: string; jobs: ProductionJob[] };
export type ProductionSaveJob = { project_id: string | null; project_name: string; project_code: string; source: "work_plan" | "manual"; sort_order: number; items: { item_name: string; quantity: number; unit: string; sort_order: number; inventory_material_id: string | null; inventory_quantity: number | null; inventory_source_location: InventoryLocation | null }[] };
export type ProjectProductionProgress = {
  id: string;
  work_date: string;
  team_leader_personnel_id: string;
  team_leader_name: string;
  source: "work_plan" | "manual";
  items: ProductionItem[];
};
