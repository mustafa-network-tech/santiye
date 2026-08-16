"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchiveRestore, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Project, ProjectSheet, ProjectCabinet } from "@/types/project";
import type { Personnel } from "@/types/work-plan";
import { ProjectSheetProgress } from "@/components/projects/project-sheet-progress";
import { BgfdCabinetProgress } from "@/components/projects/bgfd-cabinet-progress";
import {
  PROJECT_STATUSES,
  formatBooleanChoice,
  isBfOrGfProject,
  isOngoingProjectStatus,
} from "@/lib/constants/project";
import { formatDate, formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ProjectRepository } from "@/modules/projects/project-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusIndicators } from "@/components/projects/project-status-indicators";

type Props = {
  project: Project;
  typeLabel: string;
  readOnly?: boolean;
  sheets: ProjectSheet[];
  personnel: Personnel[];
  cabinets: ProjectCabinet[];
};

export function ProjectDetail({ project, typeLabel, sheets, personnel, cabinets, readOnly = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isBfOrGf = isBfOrGfProject(project.project_type);
  const tracksObk = isBfOrGf && project.tracks_obk;
  const isOngoing = isOngoingProjectStatus(project.status);

  async function handleReactivate() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Oturum bulunamadı");
      setLoading(false);
      return;
    }

    try {
      await new ProjectRepository(supabase).reactivate(project.id, user.id);
      toast.success("Proje tekrar aktif edildi");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch {
      toast.error("Proje aktifleştirilemedi");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    ...(isBfOrGf
      ? [
          { label: "Pafta Sayısı", value: project.sheet_count ?? "—" },
          { label: "HP Bilgisi", value: project.hp_count ?? "—" },
          { label: "Pafta Yapısı", value: project.is_single_sheet ? "Tek pafta" : "Çoklu pafta" },
        ]
      : []),
    { label: "Proje ID", value: project.project_code },
    { label: "Proje Türü", value: typeLabel },
    { label: "Mevki", value: project.location },
    { label: "Alınan Tarih", value: formatDate(project.received_at) },
    {
      label: "Bitiş Tarihi",
      value: project.completed_at
        ? formatDate(project.completed_at)
        : "Arşive aktarılınca işlenir",
    },
    { label: "Oluşturulma", value: formatDateTime(project.created_at) },
    { label: "Güncelleme", value: formatDateTime(project.updated_at) },
    {
      label: "Arşiv",
      value: project.is_archived
        ? `Evet (${formatDateTime(project.archived_at)})`
        : "Hayır",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div
          className={
            isOngoing
              ? "space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/35"
              : "space-y-2"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">{project.project_code}</p>
          <ProjectStatusIndicators project={project} />
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && !project.is_archived && (
            <Button asChild variant="outline">
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Düzenle
              </Link>
            </Button>
          )}
          {!readOnly && project.is_archived && (
            <Button onClick={handleReactivate} disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
              Tekrar Aktif Et
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Proje Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-sm font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Açıklama</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {project.description?.trim() || "Açıklama girilmemiş."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aşama Tarihleri</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Alınan Tarih
              </dt>
              <dd className="text-sm font-medium">
                {formatDate(project.received_at)}
              </dd>
            </div>
            {PROJECT_STATUSES.map((stage) => (
              <div key={stage.value} className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {"dateLabel" in stage && stage.dateLabel
                    ? stage.dateLabel
                    : `${stage.label} Tarihi`}
                </dt>
                <dd className="text-sm font-medium">
                  {formatDate(project[stage.dateKey])}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {project.project_type === "BGFD" ? <BgfdCabinetProgress project={project} cabinets={cabinets} personnel={personnel} readOnly={readOnly || project.is_archived}/> : <ProjectSheetProgress project={project} sheets={sheets} personnel={personnel} readOnly={readOnly || project.is_archived} />}

      {project.project_type !== "BGFD" && (isBfOrGf ||
        isOngoing ||
        project.cable_pulled !== null ||
        project.obk_pulled !== null ||
        project.joint_done !== null ||
        project.progress_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isBfOrGf
                ? `${project.project_type} Proje Takibi`
                : "Devam Eden İş Adımları"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {(!isBfOrGf || tracksObk) && (
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isBfOrGf ? "OBK" : "Kablo"}
                </dt>
                <dd className="text-sm font-medium">
                  {formatBooleanChoice(
                    isBfOrGf
                      ? project.obk_pulled
                      : project.cable_pulled,
                    "Çekildi",
                    "Çekilmedi"
                  )}
                </dd>
              </div>
              )}
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ek
                </dt>
                <dd className="text-sm font-medium">
                  {formatBooleanChoice(
                    project.joint_done,
                    "Yapıldı",
                    "Yapılmadı"
                  )}
                </dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  İş Adımı Açıklaması
                </dt>
                <dd className="whitespace-pre-wrap text-sm font-medium text-muted-foreground">
                  {project.progress_notes?.trim() || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
