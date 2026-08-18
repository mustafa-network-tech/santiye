"use client";

import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { Project } from "@/types/project";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = { projects: Project[]; exportProjects: Project[]; typeLabels: Record<string, string>; selectedTypeLabel?: string };
const STATUS_LABELS: Record<string, string> = { waiting: "Başlamadı", excavation_permit_waiting: "Kazı İzni Bekliyor", in_progress: "Devam Ediyor", completed: "Bitti", delayed: "Gecikmiş" };

export function EditableProjectsGrid({ projects, exportProjects, typeLabels, selectedTypeLabel }: Props) {
  const reportTitle = `AZG İLETİŞİM(MERKEZ) PROJE TAKİP${selectedTypeLabel ? ` — ${selectedTypeLabel.toLocaleUpperCase("tr-TR")}` : ""}`;
  function buildShareText() {
    const lines = exportProjects.map((project, index) => [
      `${index + 1}. ${typeLabels[project.project_type] ?? project.project_type} | ${project.name} | ${project.project_code}`,
      `Lokasyon: ${project.location || "—"}`,
      `Proje Özeti: ${summary(project)}`,
      `Not: ${project.progress_notes || project.description || "—"}`,
      `Son Güncelleme: ${formatDateTime(project.updated_at)}`,
    ].join("\n"));
    return `${reportTitle}\n\n${lines.join("\n\n")}`;
  }
  function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, "_blank", "noopener,noreferrer"); }
  function shareEmail() { window.location.href = `mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(buildShareText())}`; }

  return <>
    <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-medium">{reportTitle}</p><p className="text-xs text-muted-foreground">Filtrelenen {exportProjects.length} projeyi liste halinde paylaşın.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={shareWhatsApp} disabled={!exportProjects.length}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
        <Button variant="outline" size="sm" onClick={shareEmail} disabled={!exportProjects.length}><Mail className="h-4 w-4" /> E-posta</Button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="border-b bg-muted/40"><tr><Th>Tür</Th><Th>Proje Adı</Th><Th>Proje ID</Th><Th>Lokasyon</Th><Th>Proje Özeti</Th><Th>Not</Th><Th>Son Güncelleme</Th></tr></thead>
        <tbody>{projects.map(project => <tr key={project.id} className={project.status === "completed" ? "border-b border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40" : "border-b hover:bg-accent/30"}>
          <Td>{typeLabels[project.project_type] ?? project.project_type}</Td>
          <Td><Link href={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.name}</Link></Td>
          <Td>{project.project_code}</Td><Td>{project.location || "—"}</Td><Td>{summary(project)}</Td>
          <Td><div className="max-w-[280px] whitespace-pre-wrap">{project.progress_notes || project.description || "—"}</div></Td><Td>{formatDateTime(project.updated_at)}</Td>
        </tr>)}</tbody>
      </table>
      {!projects.length && <p className="p-10 text-center text-muted-foreground">Filtrelere uygun proje bulunamadı.</p>}
    </div>
  </>;
}

function summary(project: Project) {
  const status = STATUS_LABELS[project.status] ?? project.status;
  if (project.project_type === "HP_ODAKLI") return `${status} · ${project.sheet_numbers?.length ?? project.sheet_count ?? 0} pafta · %${project.progress_percent ?? 0}`;
  if (project.project_type === "BGFD") return `${status} · Dolap bazlı takip`;
  return `${status}${project.priority_order ? ` · Öncelik ${project.priority_order}` : ""}`;
}
function Th({ children }: { children: ReactNode }) { return <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</th>; }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-3 align-middle">{children}</td>; }
