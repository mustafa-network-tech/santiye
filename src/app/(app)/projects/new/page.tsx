import { createClient } from "@/lib/supabase/server";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata = {
  title: "Yeni Proje",
};

export default async function NewProjectPage() {
  const supabase = await createClient();
  const typeOptions = await new SettingsRepository(
    supabase
  ).getAllProjectTypeOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Yeni Proje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proje bilgilerini girin. Proje ID firma tarafından verilir ve manuel
          yazılır.
        </p>
      </div>
      <ProjectForm mode="create" typeOptions={typeOptions} />
    </div>
  );
}
