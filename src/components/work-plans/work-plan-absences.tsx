import type { WorkPlanAbsenceSnapshot } from "@/types/work-plan";

type Props = {
  absences: WorkPlanAbsenceSnapshot[];
  poster?: boolean;
};

const statusLabels: Record<WorkPlanAbsenceSnapshot["status"], string> = {
  leave: "İZİNLİ",
  sick_report: "RAPORLU",
};

export function WorkPlanAbsences({ absences, poster = false }: Props) {
  if (absences.length === 0) return null;

  return (
    <section
      className={
        poster
          ? "mt-4 overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50"
          : "overflow-hidden rounded-xl border bg-card"
      }
    >
      <h2 className="border-b border-slate-300 bg-slate-200 px-4 py-2 text-sm font-bold tracking-wide text-slate-900">
        İZİNLİ / RAPORLU PERSONEL
      </h2>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {absences.map((absence) => (
          <div
            key={absence.id ?? absence.personnel_id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <span className="min-w-0 break-words text-sm font-semibold">
              {absence.full_name}
            </span>
            <span className="shrink-0 rounded-md bg-slate-200 px-2 py-1 text-xs font-bold">
              {statusLabels[absence.status]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
