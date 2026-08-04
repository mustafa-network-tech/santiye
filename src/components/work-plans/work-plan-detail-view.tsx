"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Share2 } from "lucide-react";
import type { DailyWorkPlanWithTeams } from "@/types/work-plan";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WhatsAppPreview } from "@/components/work-plans/whatsapp-preview";
import { WorkPlanTeamTable } from "@/components/work-plans/work-plan-team-table";
import { useRouter } from "next/navigation";

type Props = {
  plan: DailyWorkPlanWithTeams;
};

export function WorkPlanDetailView({ plan }: Props) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {formatDate(plan.plan_date)} İş Planı
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.teams.length} ekip · snapshot kayıt
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/work-plans/${plan.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Düzenle
            </Link>
          </Button>
          <Button onClick={() => setPreviewOpen(true)}>
            <Share2 className="h-4 w-4" />
            WhatsApp İçin Hazırla
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {plan.teams.map((team, index) => (
          <WorkPlanTeamTable
            key={team.id ?? index}
            team={team}
            teamIndex={index}
          />
        ))}
      </div>

      <WhatsAppPreview
        plan={plan}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onEdit={() => {
          setPreviewOpen(false);
          router.push(`/work-plans/${plan.id}/edit`);
        }}
      />
    </div>
  );
}
