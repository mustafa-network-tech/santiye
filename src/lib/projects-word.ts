import type { Project } from "@/types/project";
import { getStatusLabel } from "@/lib/constants/project";
import { formatDateTime } from "@/lib/utils";
import { toFileSlug } from "@/lib/attendance-excel";

function projectSummary(project: Project) {
  const status = getStatusLabel(project.status);
  if (project.project_type === "HP_ODAKLI") {
    return `${status} · ${
      project.sheet_numbers?.length ?? project.sheet_count ?? 0
    } pafta · %${project.progress_percent ?? 0}`;
  }
  if (project.project_type === "BGFD") {
    return `${status} · Dolap bazlı takip`;
  }
  return `${status}${
    project.priority_order ? ` · Öncelik ${project.priority_order}` : ""
  }`;
}

export async function downloadProjectsWord(options: {
  projects: Project[];
  typeLabels: Record<string, string>;
  title: string;
}) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    PageOrientation,
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
      margins: { top: 70, bottom: 70, left: 70, right: 70 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold, size: 15 })],
        }),
      ],
    });
  const headers = [
    "Tür",
    "Proje Adı",
    "Proje ID",
    "Lokasyon",
    "Proje Özeti",
    "Not",
    "Son Güncelleme",
  ];
  const header = new TableRow({
    tableHeader: true,
    children: headers.map(
      (text) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text, bold: true, size: 15 })],
            }),
          ],
        })
    ),
  });
  const rows = options.projects.map(
    (project) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(options.typeLabels[project.project_type] ?? project.project_type),
          cell(project.name, true),
          cell(project.project_code),
          cell(project.location || "—"),
          cell(projectSummary(project)),
          cell(project.progress_notes || project.description || "—"),
          cell(formatDateTime(project.updated_at)),
        ],
      })
  );
  const wordDocument = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 600, right: 450, bottom: 600, left: 450 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "AZG İLETİŞİM MERKEZ",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: options.title, bold: true, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `Filtrelenen Proje Sayısı: ${options.projects.length}`,
              }),
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
  const blob = await Packer.toBlob(wordDocument);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${toFileSlug(options.title)}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
