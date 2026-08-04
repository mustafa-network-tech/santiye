import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkPlanRepository } from "@/modules/work-plans/work-plan-repository";
import { WorkPlanDetailView } from "@/components/work-plans/work-plan-detail-view";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const plan = await new WorkPlanRepository(supabase).getById(id);
  return {
    title: plan ? `İş Planı ${plan.plan_date}` : "İş Planı",
  };
}

export default async function WorkPlanDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const plan = await new WorkPlanRepository(supabase).getById(id);
  if (!plan) notFound();
  return <WorkPlanDetailView plan={plan} />;
}
