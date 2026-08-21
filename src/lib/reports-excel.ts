import { toFileSlug } from "@/lib/attendance-excel";

type ExcelColumn = { header: string; key: string; width: number };
type ExcelRow = Record<string, string | number | null>;

async function downloadWorkbook(options: {
  sheetName: string;
  fileName: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
}) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName);
  worksheet.columns = options.columns;
  options.rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 28 : 22;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: `${worksheet.getColumn(worksheet.columnCount).letter}1`,
  };

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

export async function downloadSimpleExcel(options: {
  title: string;
  startDate: string;
  endDate: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
}) {
  await downloadWorkbook({
    sheetName: options.title.slice(0, 31),
    fileName: `${toFileSlug(options.title)}-${options.startDate}-${options.endDate}.xlsx`,
    columns: options.columns,
    rows: options.rows,
  });
}
