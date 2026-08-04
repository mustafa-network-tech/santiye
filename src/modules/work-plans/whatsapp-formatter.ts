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
    lines.push(`── Ekip ${index + 1} ──`);
    lines.push(`Proje ID: ${team.project_code}`);
    lines.push(`Proje: ${team.project_name}`);
    lines.push(`Tür: ${team.team_type}`);
    lines.push(`Araç: ${team.vehicle_plate}`);
    lines.push("Personel:");
    team.members.forEach((member) => {
      if (member.is_chief) {
        lines.push(`${member.full_name}`);
        lines.push(`${member.phone || team.chief_phone}`);
      } else {
        lines.push(`${member.full_name}`);
      }
    });
    lines.push("");
  });

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
