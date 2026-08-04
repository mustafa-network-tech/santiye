import { createClient } from "@/lib/supabase/server";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { WorkPlanEditor } from "@/components/work-plans/work-plan-editor";

export const metadata = {
  title: "Yeni İş Planı",
};

export default async function NewWorkPlanPage() {
  const supabase = await createClient();
  const personnel = await new PersonnelRepository(supabase).list();

  return <WorkPlanEditor personnel={personnel} />;
}
