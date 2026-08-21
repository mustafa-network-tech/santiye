import type { Personnel } from "@/types/work-plan";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadPersonnelExcel(
  personnel: Personnel[],
  fileName: string
) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Personel");
  worksheet.columns = [
    { header: "Ad Soyad", key: "name", width: 30 },
    { header: "TC Kimlik No", key: "tc", width: 18 },
    { header: "Görev", key: "job", width: 24 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "Durum", key: "status", width: 12 },
  ];
  personnel.forEach((person) => {
    worksheet.addRow({
      name: person.full_name,
      tc: person.tc_identity_number || "",
      job: person.job_title || "",
      phone: person.phone || "",
      status: person.is_active ? "Aktif" : "Pasif",
    });
  });
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  worksheet.getColumn("tc").numFmt = "@";
  worksheet.eachRow((row) =>
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    })
  );
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: "E1" };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
}

export async function downloadPersonnelWord(
  personnel: Personnel[],
  fileName: string
) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");
  const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
  const cell = (text: string, bold = false) =>
    new TableCell({
      margins: { top: 90, bottom: 90, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold, size: 18 })],
        }),
      ],
    });
  const headers = ["Ad Soyad", "TC Kimlik No", "Görev", "Telefon", "Durum"];
  const header = new TableRow({
    tableHeader: true,
    children: headers.map(
      (text) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text, bold: true, size: 18 })],
            }),
          ],
        })
    ),
  });
  const rows = personnel.map(
    (person) =>
      new TableRow({
        children: [
          cell(person.full_name, true),
          cell(person.tc_identity_number || "—"),
          cell(person.job_title || "—"),
          cell(person.phone || "—"),
          cell(person.is_active ? "Aktif" : "Pasif"),
        ],
      })
  );
  const document = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "AZG İLETİŞİM MERKEZ",
                bold: true,
                size: 30,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "PERSONEL LİSTESİ",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({ text: `Toplam Personel: ${personnel.length}` }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
              insideHorizontal: border,
              insideVertical: border,
            },
            rows: [header, ...rows],
          }),
        ],
      },
    ],
  });
  downloadBlob(await Packer.toBlob(document), fileName);
}
