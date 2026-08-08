import type { WorkPlanTeamSnapshot } from "@/types/work-plan";

type Props =
  | {
      teams: WorkPlanTeamSnapshot[];
      team?: never;
      teamIndex?: never;
    }
  | {
      teams?: never;
      team: WorkPlanTeamSnapshot;
      teamIndex: number;
    };

export function WorkPlanTeamTable(props: Props) {
  // Hem eski kullanım:
  // <WorkPlanTeamTable team={team} teamIndex={index} />
  //
  // hem yeni kullanım:
  // <WorkPlanTeamTable teams={plan.teams} />
  //
  // desteklenir.
  const teams =
    "teams" in props && props.teams
      ? props.teams
      : props.team
        ? [props.team]
        : [];

  const startIndex =
    "teamIndex" in props && typeof props.teamIndex === "number"
      ? props.teamIndex
      : 0;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-300">
      <table className="w-full table-fixed border-collapse text-left text-[11px] text-slate-900">
        <thead>
          <tr className="bg-slate-100 text-[9px] uppercase tracking-wide text-slate-600">
            <th className="w-[32%] border border-slate-300 px-2 py-2 font-semibold">
              Personel
            </th>

            <th className="w-[17%] border border-slate-300 px-2 py-2 font-semibold">
              Araç Plakası
            </th>

            <th className="w-[15%] border border-slate-300 px-2 py-2 font-semibold">
              Ekip Türü
            </th>

            <th className="w-[22%] border border-slate-300 px-2 py-2 font-semibold">
              Proje Adı
            </th>

            <th className="w-[14%] border border-slate-300 px-2 py-2 font-semibold">
              Proje ID
            </th>
          </tr>
        </thead>

        <tbody>
          {teams.map((team, index) => {
            const teamIndex = startIndex + index;

            const members = [...team.members].sort(
              (a, b) => a.sort_order - b.sort_order
            );

            const rowSpan = Math.max(members.length, 1);

            // Beyaz / çok hafif farklı beyaz tonu
            const background =
              teamIndex % 2 === 0 ? "bg-white" : "bg-slate-50";

            // Personeli olmayan ekip
            if (members.length === 0) {
              return (
                <tr
                  key={`team-${teamIndex}`}
                  className={`${background} align-middle`}
                >
                  <td className="border-2 border-slate-500 px-2 py-2">
                    —
                  </td>

                  <td className="break-words border-2 border-slate-500 px-2 py-2 font-semibold">
                    {team.vehicle_plate || "—"}
                  </td>

                  <td className="break-words border-2 border-slate-500 px-2 py-2 font-semibold">
                    {team.team_type || "—"}
                  </td>

                  <td className="break-words border-2 border-slate-500 px-2 py-2 font-semibold">
                    {team.project_name || "—"}
                  </td>

                  <td className="break-words border-2 border-slate-500 px-2 py-2 font-semibold">
                    {team.project_code || "—"}
                  </td>
                </tr>
              );
            }

            return members.map((member, memberIndex) => {
              const isFirst = memberIndex === 0;
              const isLast = memberIndex === members.length - 1;

              return (
                <tr
                  key={`${teamIndex}-${member.full_name}-${memberIndex}`}
                  className={`${background} align-top`}
                >
                  {/* PERSONEL */}
                  <td
                    className={[
                      "px-2 py-1.5",
                      "border-l-2 border-r-2 border-slate-500",
                      isFirst
                        ? "border-t-2 border-t-slate-500"
                        : "border-t border-t-slate-200",
                      isLast
                        ? "border-b-2 border-b-slate-500"
                        : "border-b border-b-slate-200",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="break-words font-medium leading-tight">
                        {member.full_name}
                      </div>

                      {member.is_chief && (
                        <div className="mt-0.5 break-words text-[10px] leading-tight text-slate-600">
                          {member.phone || team.chief_phone || "—"}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* ARAÇ / EKİP TÜRÜ / PROJE / ID
                      ekip boyunca birleşik hücre */}
                  {isFirst && (
                    <>
                      <td
                        rowSpan={rowSpan}
                        className="break-words border-2 border-slate-500 px-2 py-2 align-middle font-semibold"
                      >
                        {team.vehicle_plate || "—"}
                      </td>

                      <td
                        rowSpan={rowSpan}
                        className="break-words border-2 border-slate-500 px-2 py-2 align-middle font-semibold"
                      >
                        {team.team_type || "—"}
                      </td>

                      <td
                        rowSpan={rowSpan}
                        className="break-words border-2 border-slate-500 px-2 py-2 align-middle font-semibold"
                      >
                        {team.project_name || "—"}
                      </td>

                      <td
                        rowSpan={rowSpan}
                        className="break-words border-2 border-slate-500 px-2 py-2 align-middle font-semibold"
                      >
                        {team.project_code || "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}