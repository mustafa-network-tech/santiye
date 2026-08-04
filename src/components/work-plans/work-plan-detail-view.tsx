"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Share2 } from "lucide-react";
import type { DailyWorkPlanWithTeams } from "@/types/work-plan";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsAppPreview } from "@/components/work-plans/whatsapp-preview";
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
          <Card key={team.id ?? index}>
            <CardHeader>
              <CardTitle className="text-base">Ekip {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Proje ID
                  </dt>
                  <dd className="text-sm font-medium">{team.project_code}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Proje Adı
                  </dt>
                  <dd className="text-sm font-medium">{team.project_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ekip Türü
                  </dt>
                  <dd className="text-sm font-medium">{team.team_type}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Araç
                  </dt>
                  <dd className="text-sm font-medium">{team.vehicle_plate}</dd>
                </div>
              </dl>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Personel
                </p>
                <ul className="space-y-1">
                  {team.members.map((member, idx) => (
                    <li key={`${member.full_name}-${idx}`} className="text-sm">
                      <span className="font-medium">{member.full_name}</span>
                      {member.is_chief && (
                        <span className="ml-2 text-muted-foreground">
                          {member.phone || team.chief_phone}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
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
