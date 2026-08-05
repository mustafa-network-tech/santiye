import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { AttendanceRepository } from "@/modules/attendance/attendance-repository";
import { PersonnelDetail } from "@/components/work-plans/personnel-detail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function PersonnelDetailPage({
  params,
  searchParams,
}: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    notFound();
  }
  const today = new Date();
  const requestedYear = Number(readParam(query, "year"));
  const requestedMonth = Number(readParam(query, "month"));
  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2000 &&
    requestedYear <= 2100
      ? requestedYear
      : today.getFullYear();
  const month =
    Number.isInteger(requestedMonth) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : today.getMonth() + 1;

  const supabase = await createClient();
  const personnelRepository = new PersonnelRepository(supabase);
  const attendanceRepository = new AttendanceRepository(supabase);
  const [personnel, summary] = await Promise.all([
    personnelRepository.getById(id),
    attendanceRepository.getPersonnelDetail(id, year, month),
  ]);

  if (!personnel || !summary) notFound();

  return (
    <PersonnelDetail
      personnel={personnel}
      summary={summary}
      year={year}
      month={month}
    />
  );
}
