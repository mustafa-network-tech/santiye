import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectRepository } from "@/modules/projects/project-repository";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { ProjectDetail } from "@/components/projects/project-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const project = await new ProjectRepository(supabase).getById(id);
  return {
    title: project?.name ?? "Proje",
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const projectRepo = new ProjectRepository(supabase);
  const settingsRepo = new SettingsRepository(supabase);

  const [project, customTypes] = await Promise.all([
    projectRepo.getById(id),
    settingsRepo.getCustomProjectTypes(),
  ]);

  if (!project) notFound();

  const typeLabel = settingsRepo.resolveTypeLabel(
    project.project_type,
    customTypes
  );

  return <ProjectDetail project={project} typeLabel={typeLabel} />;
}
