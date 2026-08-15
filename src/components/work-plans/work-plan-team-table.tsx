import type { WorkPlanMemberSnapshot, WorkPlanTeamSnapshot } from "@/types/work-plan";

type Props =
  | { teams: WorkPlanTeamSnapshot[]; team?: never; teamIndex?: never }
  | { teams?: never; team: WorkPlanTeamSnapshot; teamIndex: number };

const columns = [
  ["EKİP", "5%"], ["SIRA", "5%"], ["FİRMA", "7%"],
  ["PERSONEL", "23%"], ["ARAÇ PLAKASI", "12%"],
  ["EKİP TÜRÜ", "11%"], ["PROJE ADI", "27%"], ["PROJE ID", "10%"],
] as const;

function isChief(member: WorkPlanMemberSnapshot, team: WorkPlanTeamSnapshot) {
  return member.is_chief ||
    (!!team.chief_personnel_id && member.personnel_id === team.chief_personnel_id) ||
    (!team.chief_personnel_id && !!team.chief_name && member.full_name === team.chief_name);
}

export function WorkPlanTeamTable(props: Props) {
  const teams = "teams" in props && props.teams ? props.teams : props.team ? [props.team] : [];
  const startIndex = "teamIndex" in props && typeof props.teamIndex === "number" ? props.teamIndex : 0;

  return (
    <div className="w-full min-w-0 overflow-hidden border-2 border-black bg-white">
      <table className="w-full table-fixed border-collapse text-left text-[12px] leading-tight text-[#111111]">
        <colgroup>{columns.map(([label, width]) => <col key={label} style={{ width }} />)}</colgroup>
        <thead>
          <tr className="bg-[#C2A21A] text-[10px] uppercase tracking-[0.02em] text-[#111111]">
            {columns.map(([label]) => (
              <th key={label} className="border border-black px-1.5 py-2.5 text-center font-extrabold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const teamIndex = startIndex + index;
            const sortedMembers = [...team.members].sort((a, b) => a.sort_order - b.sort_order);
            const members: WorkPlanMemberSnapshot[] = sortedMembers.length > 0 ? sortedMembers : [{
              personnel_id: team.chief_personnel_id,
              full_name: team.chief_name || "—",
              job_title: null,
              phone: team.chief_phone || null,
              is_chief: true,
              sort_order: 0,
            }];
            const rowSpan = members.length;
            const background = teamIndex % 2 === 0 ? "bg-[#5F88AD]" : "bg-[#E2E2E2]";
            const mergedCell = "border border-black px-1.5 py-2 text-center align-middle font-semibold break-words";

            return members.map((member, memberIndex) => {
              const chief = isChief(member, team);
              const secondary = chief ? member.phone || team.chief_phone : member.job_title;
              const edge = `${memberIndex === 0 ? "border-t-2" : ""} ${memberIndex === rowSpan - 1 ? "border-b-2" : ""}`;
              return (
                <tr key={`${team.id ?? teamIndex}-${member.personnel_id ?? member.full_name}-${memberIndex}`} className={`${background} ${edge} border-black`}>
                  {memberIndex === 0 && <td rowSpan={rowSpan} className={mergedCell}>{teamIndex + 1}</td>}
                  <td className="border border-black px-1 py-2 text-center align-middle font-semibold">{memberIndex + 1}</td>
                  <td className="border border-black px-1 py-2 text-center align-middle font-bold">AZG</td>
                  <td className="border border-black px-2.5 py-2 text-left align-middle">
                    <div className="break-words text-[13px] font-semibold leading-tight">{member.full_name || "—"}</div>
                    {secondary && <div className="mt-1 break-words text-[10px] font-medium leading-tight text-[#111111]">({secondary})</div>}
                  </td>
                  {memberIndex === 0 && <>
                    <td rowSpan={rowSpan} className={mergedCell}>{team.vehicle_plate || "—"}</td>
                    <td rowSpan={rowSpan} className={mergedCell}>{team.team_type || "—"}</td>
                    <td rowSpan={rowSpan} className={mergedCell}>{team.project_name || "—"}</td>
                    <td rowSpan={rowSpan} className={mergedCell}>{team.project_code || "—"}</td>
                  </>}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
