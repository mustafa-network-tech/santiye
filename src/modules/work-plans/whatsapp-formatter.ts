import type { DailyWorkPlanWithTeams, WorkPlanTeamSnapshot } from "@/types/work-plan";
import { formatDate } from "@/lib/utils";

export function buildWhatsAppText(plan: DailyWorkPlanWithTeams): string {
  const lines: string[] = [
    "GÜNLÜK İŞ PLANI",
    formatDate(plan.plan_date, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    "",
  ];

  plan.teams.forEach((team, index) => {
    const members = [...team.members].sort((a, b) => a.sort_order - b.sort_order);
    lines.push(`Ekip ${index + 1}`);
    lines.push(
      "Personel | Araç Plakası | Ekip Türü | Proje Adı | Proje ID"
    );

    members.forEach((member, idx) => {
      if (idx === 0) {
        const phone = member.is_chief
          ? `\n${member.phone || team.chief_phone}`
          : "";
        lines.push(
          `${member.full_name}${phone} | ${team.vehicle_plate} | ${team.team_type} | ${team.project_name} | ${team.project_code}`
        );
      } else {
        lines.push(`${member.full_name} |  |  |  | `);
      }
    });

    if (members.length === 0) {
      lines.push(
        `— | ${team.vehicle_plate} | ${team.team_type} | ${team.project_name} | ${team.project_code}`
      );
    }

    lines.push("");
  });

  if (plan.absences.length > 0) {
    lines.push("İZİNLİ / RAPORLU PERSONEL");
    plan.absences.forEach((absence) => {
      const status = absence.status === "leave" ? "İzinli" : "Raporlu";
      lines.push(`- ${absence.full_name} — ${status}`);
    });
  }

  return lines.join("\n").trim();
}

export function ensureChiefFirst(
  members: WorkPlanTeamSnapshot["members"]
): WorkPlanTeamSnapshot["members"] {
  const chiefs = members.filter((m) => m.is_chief);
  const others = members.filter((m) => !m.is_chief);
  const ordered = [...chiefs, ...others].map((m, idx) => ({
    ...m,
    sort_order: idx,
  }));
  return ordered;
}
