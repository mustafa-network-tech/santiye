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

  const [stats, recentlyUpdated, recentlyCreated, typeOptions] =
    await Promise.all([
      dashboardRepo.getStats(),
      dashboardRepo.getRecentlyUpdated(8),
      dashboardRepo.getRecentlyCreated(8),
      settingsRepo.getAllProjectTypeOptions(),
    ]);

  const typeLabels = Object.fromEntries(
    typeOptions.map((t) => [t.key, t.label])
  );

  return (
    <DashboardView
      stats={stats}
      recentlyUpdated={recentlyUpdated}
      recentlyCreated={recentlyCreated}
      typeLabels={typeLabels}
    />
  );
}
