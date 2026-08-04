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
import type { DashboardStats, Project } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/lib/constants/project";
import { formatDateTime } from "@/lib/utils";

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Toplam Proje",
    icon: FolderKanban,
    href: "/projects",
  },
  {
    key: "waiting" as const,
    label: "Bekliyor",
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
  recentlyUpdated: Project[];
  recentlyCreated: Project[];
  typeLabels: Record<string, string>;
};

export function DashboardView({
  stats,
  recentlyUpdated,
  recentlyCreated,
  typeLabels,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tüm şantiye projelerinin anlık durumu
        </p>
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
