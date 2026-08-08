import type { WorkPlanTeamSnapshot } from "@/types/work-plan";

/** WhatsApp / görsel çıktısı için satır tabanlı ekip tablosu — Personel ilk sütun */
export function WorkPlanTeamTable({
  team,
  teamIndex,
}: {
  team: WorkPlanTeamSnapshot;
  teamIndex: number;
}) {
  const members = [...team.members].sort((a, b) => a.sort_order - b.sort_order);
  const rowSpan = Math.max(members.length, 1);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
        Ekip {teamIndex + 1}
      </div>
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm text-slate-900">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="border-b border-slate-200 px-3 py-2 font-medium">
              Personel
            </th>
            <th className="border-b border-slate-200 px-3 py-2 font-medium">
              Araç Plakası
            </th>
            <th className="border-b border-slate-200 px-3 py-2 font-medium">
              Ekip Türü
            </th>
            <th className="border-b border-slate-200 px-3 py-2 font-medium">
              Proje Adı
            </th>
            <th className="border-b border-slate-200 px-3 py-2 font-medium">
              Proje ID
            </th>
          </tr>
        </thead>
        <tbody>
          {members.length === 0 ? (
            <tr>
              <td className="border-b border-slate-100 px-3 py-2">—</td>
              <td className="border-b border-slate-100 px-3 py-2 font-semibold">
                {team.vehicle_plate}
              </td>
              <td className="border-b border-slate-100 px-3 py-2 font-semibold">
                {team.team_type}
              </td>
              <td className="border-b border-slate-100 px-3 py-2 font-semibold">
                {team.project_name}
              </td>
              <td className="border-b border-slate-100 px-3 py-2 font-semibold">
                {team.project_code}
              </td>
            </tr>
          ) : (
            members.map((member, idx) => (
              <tr key={`${member.full_name}-${idx}`} className="align-top">
                <td className="border-b border-slate-100 px-3 py-2">
                  <span className="font-medium">{member.full_name}</span>
                  {member.is_chief && (
                    <span className="mt-0.5 block text-slate-600">
                      {member.phone || team.chief_phone}
                    </span>
                  )}
                </td>
                {idx === 0 ? (
                  <>
                    <td
                      rowSpan={rowSpan}
                      className="border-b border-slate-100 px-3 py-2 font-semibold"
                    >
                      {team.vehicle_plate}
                    </td>
                    <td
                      rowSpan={rowSpan}
                      className="border-b border-slate-100 px-3 py-2 font-semibold"
                    >
                      {team.team_type}
                    </td>
                    <td
                      rowSpan={rowSpan}
                      className="border-b border-slate-100 px-3 py-2 font-semibold"
                    >
                      {team.project_name}
                    </td>
                    <td
                      rowSpan={rowSpan}
                      className="border-b border-slate-100 px-3 py-2 font-semibold"
                    >
                      {team.project_code}
                    </td>
                  </>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
