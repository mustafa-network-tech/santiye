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
      <table className="w-full table-fixed border-collapse text-left text-[12px] text-slate-900">
        <thead>
          <tr className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
            <th className="w-[37%] border border-slate-300 px-2 py-2.5 text-center font-semibold">
              Personel
            </th>

            <th className="w-[15%] border border-slate-300 px-2 py-2.5 font-semibold">
              Araç Plakası
            </th>

            <th className="w-[14%] border border-slate-300 px-2 py-2.5 font-semibold">
              Ekip Türü
            </th>

            <th className="w-[21%] border border-slate-300 px-2 py-2.5 font-semibold">
              Proje Adı
            </th>

            <th className="w-[13%] border border-slate-300 px-2 py-2.5 font-semibold">
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

            const chiefMember = members.find((member) => member.is_chief);
            const chiefName = chiefMember?.full_name || team.chief_name;
            const chiefPhone = chiefMember?.phone || team.chief_phone;
            const personnel = members.filter((member) => {
              if (member.is_chief) return false;
              if (chiefMember) return member !== chiefMember;

              return !(
                (team.chief_personnel_id &&
                  member.personnel_id === team.chief_personnel_id) ||
                (team.chief_name && member.full_name === team.chief_name)
              );
            });

            // Beyaz / çok hafif farklı beyaz tonu
            const background =
              teamIndex % 2 === 0 ? "bg-white" : "bg-slate-50";

            return (
              <tr key={`team-${teamIndex}`} className={`${background} align-middle`}>
                {/* PERSONEL */}
                <td className="border-2 border-slate-500 px-2.5 py-2.5">
                  <div className="min-w-0 text-center">
                    <div className="break-words text-[13px] font-semibold leading-tight">
                      {chiefName || "—"}
                    </div>

                    {chiefName && (
                      <div className="mt-1 break-words text-[11px] font-medium leading-tight text-slate-600">
                        {chiefPhone || "—"}
                      </div>
                    )}

                    {personnel.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 border-t border-slate-300 pt-2">
                        {personnel.map((member, memberIndex) => (
                          <div
                            key={`${member.personnel_id || member.full_name}-${memberIndex}`}
                            className={[
                              "break-words px-1.5 py-0.5 text-[12px] font-medium leading-tight",
                              memberIndex % 2 === 1
                                ? "border-l border-slate-300"
                                : "",
                            ].join(" ")}
                          >
                            {member.full_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                <td className="break-words border-2 border-slate-500 px-2 py-2.5 align-middle text-[13px] font-semibold">
                  {team.vehicle_plate || "—"}
                </td>

                <td className="break-words border-2 border-slate-500 px-2 py-2.5 align-middle text-[12px] font-semibold">
                  {team.team_type || "—"}
                </td>

                <td className="break-words border-2 border-slate-500 px-2 py-2.5 align-middle text-[12px] font-semibold">
                  {team.project_name || "—"}
                </td>

                <td className="break-words border-2 border-slate-500 px-2 py-2.5 align-middle text-[12px] font-semibold">
                  {team.project_code || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
