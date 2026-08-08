import type { InventoryUnit } from "@/types/inventory";

export const INVENTORY_UNITS: {
  value: InventoryUnit;
  label: string;
  shortLabel: string;
}[] = [
  { value: "piece", label: "Adet", shortLabel: "adet" },
  { value: "meter", label: "Metre", shortLabel: "mt" },
  { value: "kilogram", label: "Kilo", shortLabel: "kg" },
];

export function getInventoryUnitLabel(unit: InventoryUnit) {
  return (
    INVENTORY_UNITS.find((item) => item.value === unit)?.shortLabel ?? unit
  );
}

export function formatInventoryQuantity(
  quantity: number,
  unit: InventoryUnit
) {
  const value = Number(quantity);
  return `${value.toLocaleString("tr-TR", {
    maximumFractionDigits: unit === "piece" ? 0 : 3,
  })} ${getInventoryUnitLabel(unit)}`;
}
