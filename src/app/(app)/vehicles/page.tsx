import { createClient } from "@/lib/supabase/server";
import { VehicleRepository } from "@/modules/vehicles/vehicle-repository";
import { VehiclesManager } from "@/components/vehicles/vehicles-manager";
import { UserRepository } from "@/modules/users/user-repository";

export const metadata = {
  title: "Araçlar",
};

export default async function VehiclesPage() {
  const supabase = await createClient();
  const [vehicles, canWrite] = await Promise.all([
    new VehicleRepository(supabase).list(),
    new UserRepository(supabase).canWrite("vehicles"),
  ]);
  return (
    <VehiclesManager
      initialVehicles={vehicles}
      readOnly={!canWrite}
    />
  );
}
