import { createClient } from "@/lib/supabase/server";
import { DashboardRepository } from "@/modules/dashboard/dashboard-repository";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const dashboardRepo = new DashboardRepository(supabase);
  const settingsRepo = new SettingsRepository(supabase);

  const [overview, typeOptions] = await Promise.all([
    dashboardRepo.getOverview(),
    settingsRepo.getAllProjectTypeOptions(),
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
    />
  );
}
