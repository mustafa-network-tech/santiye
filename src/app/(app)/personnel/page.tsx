import { createClient } from "@/lib/supabase/server";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { PersonnelManager } from "@/components/work-plans/personnel-manager";
import { UserRepository } from "@/modules/users/user-repository";
import { VehicleRepository } from "@/modules/vehicles/vehicle-repository";

export const metadata = {
  title: "Personel",
};

export default async function PersonnelPage() {
  const supabase = await createClient();
  const [personnel, assignedVehicles, canWrite] = await Promise.all([
    new PersonnelRepository(supabase).list(),
    new VehicleRepository(supabase).list(),
    new UserRepository(supabase).canWrite("personnel"),
  ]);

  return (
    <PersonnelManager
      initialPersonnel={personnel}
      assignedVehicles={assignedVehicles.filter((vehicle) => vehicle.assigned_personnel_id)}
      readOnly={!canWrite}
    />
  );
}
