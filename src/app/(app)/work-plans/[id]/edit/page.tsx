import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkPlanRepository } from "@/modules/work-plans/work-plan-repository";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { WorkPlanEditor } from "@/components/work-plans/work-plan-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "İş Planını Düzenle",
};

export default async function EditWorkPlanPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [plan, personnel] = await Promise.all([
    new WorkPlanRepository(supabase).getById(id),
    new PersonnelRepository(supabase).list(),
  ]);

  if (!plan) notFound();

  return (
    <WorkPlanEditor
      personnel={personnel}
      existingPlanId={plan.id}
      initialDate={plan.plan_date}
      initialTeams={plan.teams}
      initialNotes={plan.notes}
    />
  );
}
