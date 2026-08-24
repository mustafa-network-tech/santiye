import { createClient } from "@/lib/supabase/server";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { UserRepository } from "@/modules/users/user-repository";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";

export const metadata = {
  title: "Malzeme Stok",
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const repository = new InventoryRepository(supabase);
  const [materials, movements, shipments, personnel, canWrite] = await Promise.all([
    repository.listMaterials("stock"),
    repository.listMovements(),
    repository.listShipments(),
    new PersonnelRepository(supabase).list({ activeOnly: true }),
    new UserRepository(supabase).canWrite("inventory"),
  ]);

  return (
    <InventoryManager
      initialMaterials={materials}
      initialMovements={movements}
      initialShipments={shipments}
      personnel={personnel}
      readOnly={!canWrite}
    />
  );
}
