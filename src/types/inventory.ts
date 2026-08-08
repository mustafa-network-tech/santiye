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

export type CustodyLocationType = "warehouse" | "personnel" | "team";

export type InventoryCustodyBalance = {
  id: string;
  material_id: string;
  holder_type: Exclude<CustodyLocationType, "warehouse">;
  holder_id: string;
  holder_name: string;
  quantity: number;
  updated_at: string;
  material?: Pick<
    InventoryMaterial,
    "material_name" | "material_code" | "unit"
  > | null;
};

export type InventoryCustodyMovement = {
  id: string;
  material_id: string;
  from_type: CustodyLocationType;
  from_id: string | null;
  from_name: string;
  to_type: CustodyLocationType;
  to_id: string | null;
  to_name: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  material?: Pick<
    InventoryMaterial,
    "material_name" | "material_code" | "unit"
  > | null;
};

export type CustodyTeamOption = {
  id: string;
  label: string;
};
