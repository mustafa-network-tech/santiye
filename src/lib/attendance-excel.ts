import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/types/attendance";

type AttendanceExcelPerson = {
  fullName: string;
  tcIdentityNumber: string | null;
  records: AttendanceRecord[];
};

const EXCEL_STATUSES = [
  "worked",
  "leave",
  "medical_report",
  "unexcused_absence",
  "weekly_rest",
] as const satisfies readonly AttendanceStatus[];

export function maskTcIdentityNumber(value: string | null | undefined) {
  if (!value) return "";
  return `${value.slice(0, 3)}******${value.slice(-2)}`;
}

export function countAttendanceRecords(records: AttendanceRecord[]) {
  const totals = Object.fromEntries(
    EXCEL_STATUSES.map((status) => [status, 0])
  ) as Record<(typeof EXCEL_STATUSES)[number], number>;

  records.forEach((record) => {
    if (EXCEL_STATUSES.includes(record.status as keyof typeof totals)) {
      totals[record.status as keyof typeof totals] += 1;
    }
  });
  return totals;
}

export async function downloadAttendanceSummaryExcel(options: {
  personnel: AttendanceExcelPerson[];
  year: number;
  month: number;
  fileName: string;
}) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Puantaj Özeti");

  worksheet.columns = [
    { header: "Ad Soyad", key: "fullName", width: 28 },
    { header: "TC Kimlik No", key: "tcIdentityNumber", width: 18 },
    { header: "Çalıştığı Gün Sayısı", key: "worked", width: 22 },
    { header: "İzinli Gün Sayısı", key: "leave", width: 19 },
    { header: "Raporlu Gün Sayısı", key: "medicalReport", width: 20 },
    {
      header: "Mazeretsiz Gelmedi Gün Sayısı",
      key: "unexcusedAbsence",
      width: 31,
    },
    { header: "Hafta Tatili Gün Sayısı", key: "weeklyRest", width: 24 },
    { header: "Toplam Hak Edilen Gün", key: "payableDays", width: 25 },
  ];

  options.personnel.forEach((person) => {
    const totals = countAttendanceRecords(person.records);
    worksheet.addRow({
      fullName: person.fullName,
      tcIdentityNumber: maskTcIdentityNumber(person.tcIdentityNumber),
      worked: totals.worked,
      leave: totals.leave,
      medicalReport: totals.medical_report,
      unexcusedAbsence: totals.unexcused_absence,
      weeklyRest: totals.weekly_rest,
      payableDays: totals.worked + totals.weekly_rest,
    });
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getColumn("tcIdentityNumber").numFmt = "@";
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: "H1" };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function toFileSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
