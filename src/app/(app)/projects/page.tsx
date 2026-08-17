import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProjectRepository } from "@/modules/projects/project-repository";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { parseProjectSearchParams } from "@/lib/search-params";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRepository } from "@/modules/users/user-repository";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";

export const metadata = {
  title: "Projeler",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ProjectsContent({ searchParams }: Props) {
  const params = await searchParams;
  const filters = parseProjectSearchParams(params, {
    archiveScope: "active",
  });

  const supabase = await createClient();
  const projectRepo = new ProjectRepository(supabase);
  const settingsRepo = new SettingsRepository(supabase);

  const [result, typeOptions, locations, canWrite, personnel] = await Promise.all([
    projectRepo.list(filters),
    settingsRepo.getAllProjectTypeOptions(),
    projectRepo.getDistinctLocations(),
    new UserRepository(supabase).canWrite("projects"),
    new PersonnelRepository(supabase).list({ activeOnly: true }),
  ]);

  const typeLabels = Object.fromEntries(
    typeOptions.map((t) => [t.key, t.label])
  );

  return (
    <ProjectsTable
      title="Projeler"
      result={result}
      typeOptions={typeOptions}
      locations={locations}
      typeLabels={typeLabels}
      showCreate={canWrite}
      showInlineEdit={canWrite}
      personnel={personnel}
      defaultArchiveScope="active"
      allowArchiveScopeFilter
    />
  );
}

export default function ProjectsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjectsContent {...props} />
    </Suspense>
  );
}
