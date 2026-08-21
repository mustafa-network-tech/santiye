import { createClient } from "@/lib/supabase/server";
import { DashboardRepository } from "@/modules/dashboard/dashboard-repository";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { VehicleRepository } from "@/modules/vehicles/vehicle-repository";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { WorkPlanRepository } from "@/modules/work-plans/work-plan-repository";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { todayISODate } from "@/lib/constants/project";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const dashboardRepo = new DashboardRepository(supabase);
  const settingsRepo = new SettingsRepository(supabase);
  const vehicleRepo = new VehicleRepository(supabase);

  const [
    overview,
    typeOptions,
    vehicleAlerts,
    personnel,
    todayPlan,
    stockMaterials,
    vehicles,
  ] = await Promise.all([
    dashboardRepo.getOverview(),
    settingsRepo.getAllProjectTypeOptions(),
    vehicleRepo.getDeadlineAlerts(),
    new PersonnelRepository(supabase).list(),
    new WorkPlanRepository(supabase).getByDate(todayISODate()),
    new InventoryRepository(supabase).listMaterials("stock"),
    vehicleRepo.list(),
  ]);

  const typeLabels = Object.fromEntries(
    typeOptions.map((t) => [t.key, t.label])
  );

  return (
    <DashboardView
      stats={overview.stats}
      categoryAnalysis={overview.categories}
      criticalStats={overview.critical}
      recentlyUpdated={overview.recently_updated}
      recentlyCreated={overview.recently_created}
      typeLabels={typeLabels}
      vehicleAlerts={vehicleAlerts}
      operationalStats={{
        activePersonnel: personnel.filter((person) => person.is_active).length,
        todayTeams: todayPlan?.teams.length ?? 0,
        vehicleCount: vehicles.length,
        emptyStock: stockMaterials.filter((item) => Number(item.stock_quantity) <= 0)
          .length,
      }}
    />
  );
}
