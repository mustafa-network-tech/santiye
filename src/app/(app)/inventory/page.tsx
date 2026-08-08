import { createClient } from "@/lib/supabase/server";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { UserRepository } from "@/modules/users/user-repository";

export const metadata = {
  title: "Malzeme Stok",
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const repository = new InventoryRepository(supabase);
  const [materials, movements, canWrite] = await Promise.all([
    repository.listMaterials(),
    repository.listMovements(),
    new UserRepository(supabase).canWrite("inventory"),
  ]);

  return (
    <InventoryManager
      initialMaterials={materials}
      initialMovements={movements}
      readOnly={!canWrite}
    />
  );
}
