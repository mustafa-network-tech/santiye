"use client";

import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Project } from "@/types/project";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = { projects: Project[]; exportProjects: Project[]; typeLabels: Record<string, string>; selectedTypeLabel?: string };
const STATUS_LABELS: Record<string, string> = { waiting: "Başlamadı", excavation_permit_waiting: "Kazı İzni Bekliyor", in_progress: "Devam Ediyor", completed: "Bitti", delayed: "Gecikmiş" };

export function EditableProjectsGrid({ projects, exportProjects, typeLabels, selectedTypeLabel }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState<"whatsapp" | "email" | null>(null);
  const reportTitle = `AZG İLETİŞİM(MERKEZ) PROJE TAKİP${selectedTypeLabel ? ` — ${selectedTypeLabel.toLocaleUpperCase("tr-TR")}` : ""}`;

  async function shareReport(channel: "whatsapp" | "email") {
    if (!reportRef.current) return;
    setSharing(channel);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(reportRef.current, { backgroundColor: "#ffffff", pixelRatio: 1.5, cacheBust: true });
      if (!blob) throw new Error("Tablo görseli oluşturulamadı");
      const file = new File([blob], "azg-proje-takip.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: reportTitle, text: reportTitle, files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "azg-proje-takip.png";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.info("Tablo görseli indirildi", { description: "Tarayıcı dosya eklemeyi desteklemediği için indirilen PNG dosyasını mesaja ekleyin." });
      if (channel === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(reportTitle)}`, "_blank", "noopener,noreferrer");
      else window.location.href = `mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent("Proje takip tablosu ektedir.")}`;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      toast.error("Tablo paylaşım için hazırlanamadı");
    } finally { setSharing(null); }
  }

  return <>
    <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-medium">{reportTitle}</p><p className="text-xs text-muted-foreground">Filtrelenen {exportProjects.length} projeyi tablo olarak paylaşın.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => shareReport("whatsapp")} disabled={!exportProjects.length || sharing !== null}><MessageCircle className="h-4 w-4" /> {sharing === "whatsapp" ? "Hazırlanıyor..." : "WhatsApp"}</Button>
        <Button variant="outline" size="sm" onClick={() => shareReport("email")} disabled={!exportProjects.length || sharing !== null}><Mail className="h-4 w-4" /> {sharing === "email" ? "Hazırlanıyor..." : "E-posta"}</Button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="border-b bg-muted/40"><tr><Th>Tür</Th><Th>Proje Adı</Th><Th>Proje ID</Th><Th>Lokasyon</Th><Th>Proje Özeti</Th><Th>Not</Th><Th>Son Güncelleme</Th></tr></thead>
        <tbody>{projects.map(project => <tr key={project.id} className={project.status === "completed" ? "border-b border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40" : "border-b hover:bg-accent/30"}>
          <Td>{typeLabels[project.project_type] ?? project.project_type}</Td><Td><Link href={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.name}</Link></Td><Td>{project.project_code}</Td><Td>{project.location || "—"}</Td><Td>{summary(project)}</Td><Td><div className="max-w-[280px] whitespace-pre-wrap">{project.progress_notes || project.description || "—"}</div></Td><Td>{formatDateTime(project.updated_at)}</Td>
        </tr>)}</tbody>
      </table>
      {!projects.length && <p className="p-10 text-center text-muted-foreground">Filtrelere uygun proje bulunamadı.</p>}
    </div>
    <div ref={reportRef} className="fixed left-[-10000px] top-0 w-[1400px] bg-white p-8 text-black">
      <h1 className="mb-5 text-center text-2xl font-bold">{reportTitle}</h1>
      <table className="w-full table-fixed border-collapse text-[13px]">
        <thead><tr className="bg-slate-200"><ReportTh>Tür</ReportTh><ReportTh>Proje Adı</ReportTh><ReportTh>Proje ID</ReportTh><ReportTh>Lokasyon</ReportTh><ReportTh>Proje Özeti</ReportTh><ReportTh>Not</ReportTh><ReportTh>Son Güncelleme</ReportTh></tr></thead>
        <tbody>{exportProjects.map(project => <tr key={project.id} className={project.status === "completed" ? "bg-blue-100" : "bg-white"}><ReportTd>{typeLabels[project.project_type] ?? project.project_type}</ReportTd><ReportTd>{project.name}</ReportTd><ReportTd>{project.project_code}</ReportTd><ReportTd>{project.location || "—"}</ReportTd><ReportTd>{summary(project)}</ReportTd><ReportTd>{project.progress_notes || project.description || "—"}</ReportTd><ReportTd>{formatDateTime(project.updated_at)}</ReportTd></tr>)}</tbody>
      </table>
    </div>
  </>;
}

function summary(project: Project) { const status = STATUS_LABELS[project.status] ?? project.status; if (project.project_type === "HP_ODAKLI") return `${status} · ${project.sheet_numbers?.length ?? project.sheet_count ?? 0} pafta · %${project.progress_percent ?? 0}`; if (project.project_type === "BGFD") return `${status} · Dolap bazlı takip`; return `${status}${project.priority_order ? ` · Öncelik ${project.priority_order}` : ""}`; }
function Th({ children }: { children: ReactNode }) { return <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</th>; }
function Td({ children }: { children: ReactNode }) { return <td className="px-4 py-3 align-middle">{children}</td>; }
function ReportTh({ children }: { children: ReactNode }) { return <th className="border border-slate-500 p-2 text-left font-bold">{children}</th>; }
function ReportTd({ children }: { children: ReactNode }) { return <td className="break-words border border-slate-400 p-2 align-top">{children}</td>; }
