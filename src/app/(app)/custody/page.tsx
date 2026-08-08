import { createClient } from "@/lib/supabase/server";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { UserRepository } from "@/modules/users/user-repository";
import { CustodyManager } from "@/components/inventory/custody-manager";

export const metadata = {
  title: "Malzeme Zimmet",
};

export default async function CustodyPage() {
  const supabase = await createClient();
  const inventoryRepository = new InventoryRepository(supabase);
  const [
    materials,
    balances,
    movements,
    personnel,
    teams,
    canWrite,
  ] = await Promise.all([
    inventoryRepository.listMaterials(),
    inventoryRepository.listCustodyBalances(),
    inventoryRepository.listCustodyMovements(),
    new PersonnelRepository(supabase).list(),
    inventoryRepository.listTeamOptions(),
    new UserRepository(supabase).canWrite("custody"),
  ]);

  return (
    <CustodyManager
      initialMaterials={materials}
      initialBalances={balances}
      initialMovements={movements}
      personnel={personnel}
      teams={teams}
      readOnly={!canWrite}
    />
  );
}
