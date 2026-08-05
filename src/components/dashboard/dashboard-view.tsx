"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  Clock3,
  FolderKanban,
  HardHat,
  PauseCircle,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardCategoryAnalysis,
  DashboardCriticalStats,
  DashboardStats,
  Project,
} from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/lib/constants/project";
import { formatDateTime } from "@/lib/utils";
import { ProjectTypeShortcuts } from "@/components/projects/project-type-shortcuts";
import { CategoryDoughnutChart } from "@/components/dashboard/category-doughnut-chart";

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Toplam Proje",
    icon: FolderKanban,
    href: "/projects",
  },
  {
    key: "waiting" as const,
    label: "Başlamadı",
    icon: PauseCircle,
    href: "/projects?status=waiting",
  },
  {
    key: "in_progress" as const,
    label: "Devam Ediyor",
    icon: HardHat,
    href: "/projects?status=in_progress",
  },
  {
    key: "excavation_permit_waiting" as const,
    label: "Kazı İzni Bekliyor",
    icon: Clock3,
    href: "/projects?status=excavation_permit_waiting",
  },
  {
    key: "delayed" as const,
    label: "Gecikmiş",
    icon: TriangleAlert,
    href: "/projects?status=delayed",
  },
  {
    key: "completed" as const,
    label: "Tamamlandı",
    icon: CheckCircle2,
    href: "/archive?status=completed",
  },
  {
    key: "archived" as const,
    label: "Arşiv",
    icon: Archive,
    href: "/archive",
  },
];

type Props = {
  stats: DashboardStats;
  categoryAnalysis: DashboardCategoryAnalysis[];
  criticalStats: DashboardCriticalStats;
  recentlyUpdated: Project[];
  recentlyCreated: Project[];
  typeLabels: Record<string, string>;
};

export function DashboardView({
  stats,
  categoryAnalysis,
  criticalStats,
  recentlyUpdated,
  recentlyCreated,
  typeLabels,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tüm şantiye projelerinin anlık durumu
          </p>
        </div>
        <ProjectTypeShortcuts />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {STAT_CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
            >
              <Link href={card.href}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold tracking-tight">
                      {stats[card.key]}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Kategori Analizi
          </h2>
          <p className="text-sm text-muted-foreground">
            BF, GF ve Kurumsal projelerin aşama dağılımı
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {categoryAnalysis.map((analysis) => (
            <CategoryDoughnutChart
              key={analysis.category}
              analysis={analysis}
            />
          ))}
        </div>
      </section>

      <CriticalSituations stats={criticalStats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectMiniList
          title="Son Güncellenen Projeler"
          projects={recentlyUpdated}
          typeLabels={typeLabels}
        />
        <ProjectMiniList
          title="Son Eklenen Projeler"
          projects={recentlyCreated}
          typeLabels={typeLabels}
        />
      </div>
    </div>
  );
}

const CRITICAL_ITEMS = [
  {
    key: "delayed" as const,
    label: "Gecikmiş Projeler",
    color: "bg-red-500",
    href: "/projects?status=delayed",
  },
  {
    key: "excavation_waiting" as const,
    label: "Kazı İzni Bekleyen",
    color: "bg-orange-500",
    href: "/projects?status=excavation_permit_waiting",
  },
  {
    key: "obk_waiting" as const,
    label: "OBK Bekleyen",
    color: "bg-violet-500",
    href: "/projects?stage=obk_waiting",
  },
  {
    key: "cable_waiting" as const,
    label: "Kablo Bekleyen",
    color: "bg-yellow-500",
    href: "/projects?stage=cable_waiting",
  },
];

function CriticalSituations({ stats }: { stats: DashboardCriticalStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kritik Durumlar</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CRITICAL_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {stats[item.key]}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function ProjectMiniList({
  title,
  projects,
  typeLabels,
}: {
  title: string;
  projects: Project[];
  typeLabels: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz proje yok.</p>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.project_code} · {project.location} ·{" "}
                  {typeLabels[project.project_type] ?? project.project_type}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(project.updated_at)}
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
