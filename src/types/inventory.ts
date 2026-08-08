export type InventoryUnit = "piece" | "meter" | "kilogram";
export type InventoryMovementType = "in" | "out";

export type InventoryMaterial = {
  id: string;
  material_code: string | null;
  material_name: string;
  unit: InventoryUnit;
  stock_quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  material_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  usage_location: string | null;
  description: string | null;
  balance_after: number;
  created_at: string;
  material?: {
    material_name: string;
    material_code: string | null;
    unit: InventoryUnit;
  } | null;
};
