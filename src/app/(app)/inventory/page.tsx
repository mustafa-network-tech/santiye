import { createClient } from "@/lib/supabase/server";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { UserRepository } from "@/modules/users/user-repository";
import { ProjectRepository } from "@/modules/projects/project-repository";

export const metadata = {
  title: "Malzeme Stok",
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const repository = new InventoryRepository(supabase);
  const [materials, movements, projects, canWrite] = await Promise.all([
    repository.listMaterials("stock"),
    repository.listMovements(),
    new ProjectRepository(supabase).list({
      archiveScope: "all",
      pageSize: 1000,
      sortBy: "name",
      sortOrder: "asc",
    }),
    new UserRepository(supabase).canWrite("inventory"),
  ]);

  return (
    <InventoryManager
      initialMaterials={materials}
      initialMovements={movements}
      projects={projects.data}
      readOnly={!canWrite}
    />
  );
}
