"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import type {
  Project,
  ProjectStatus,
  ProjectTrackingUpdate,
} from "@/types/project";
import {
  PROJECT_STATUSES,
  getStatusLabel,
  isBfOrGfProject,
} from "@/lib/constants/project";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ProjectRepository } from "@/modules/projects/project-repository";
import { Button } from "@/components/ui/button";

type EditableField =
  | "tracks_obk"
  | "obk_pulled"
  | "joint_done"
  | "cable_pulled"
  | "tracks_excavation"
  | "excavation_done"
  | "status";

type Props = {
  projects: Project[];
  typeLabels: Record<string, string>;
  onDirtyChange?: (count: number) => void;
};

const BOOLEAN_OPTIONS = [
  { value: "unset", label: "—" },
  { value: "true", label: "Evet" },
  { value: "false", label: "Hayır" },
] as const;

function normalizeProject(project: Project): Project {
  return {
    ...project,
    tracks_obk: project.tracks_obk ?? false,
    tracks_joint: true,
    tracks_cable: true,
    tracks_excavation:
      project.tracks_excavation ??
      (project.excavation_done !== null ||
        project.status === "excavation_permit_waiting"),
    excavation_done: project.excavation_done ?? null,
  };
}

function toUpdate(project: Project): ProjectTrackingUpdate {
  return {
    id: project.id,
    tracks_obk: project.tracks_obk,
    obk_pulled: project.tracks_obk ? project.obk_pulled : null,
    tracks_joint: true,
    joint_done: project.joint_done,
    tracks_cable: true,
    cable_pulled: project.cable_pulled,
    tracks_excavation: project.tracks_excavation,
    excavation_done: project.tracks_excavation
      ? project.excavation_done
      : null,
    status: project.status,
  };
}

export function EditableProjectsGrid({
  projects,
  typeLabels,
  onDirtyChange,
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(() => projects.map(normalizeProject));
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(projects.map(normalizeProject));
    setDirtyIds(new Set());
    onDirtyChange?.(0);
  }, [projects, onDirtyChange]);

  useEffect(() => {
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (dirtyIds.size === 0) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [dirtyIds.size]);

  const updateCell = useCallback(
    (id: string, field: EditableField, value: boolean | null | ProjectStatus) => {
      setRows((current) =>
        current.map((project) => {
          if (project.id !== id) return project;
          const next = { ...project, [field]: value };

          if (field === "tracks_obk" && value === false)
            next.obk_pulled = null;
          if (field === "tracks_excavation" && value === false)
            next.excavation_done = null;

          return next;
        })
      );
      setDirtyIds((current) => {
        const next = new Set(current).add(id);
        onDirtyChange?.(next.size);
        return next;
      });
    },
    [onDirtyChange]
  );

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "project_type",
        header: "Tür",
        size: 75,
        cell: ({ row }) =>
          typeLabels[row.original.project_type] ?? row.original.project_type,
      },
      {
        accessorKey: "name",
        header: "Proje Adı",
        size: 220,
        cell: ({ row }) => (
          <Link
            href={`/projects/${row.original.id}`}
            className="block truncate font-medium text-primary hover:underline"
            title={row.original.name}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "project_code",
        header: "Proje ID",
        size: 125,
      },
      {
        accessorKey: "location",
        header: "Mevki",
        size: 145,
        cell: ({ row }) => (
          <span className="block truncate" title={row.original.location}>
            {row.original.location}
          </span>
        ),
      },
      {
        id: "tracks_obk",
        header: "OBK Var",
        size: 100,
        cell: ({ row }) => (
          <PresenceSelect
            value={row.original.tracks_obk}
            disabled={!isBfOrGfProject(row.original.project_type)}
            onChange={(value) =>
              updateCell(row.original.id, "tracks_obk", value)
            }
          />
        ),
      },
      {
        id: "obk_pulled",
        header: "OBK Çekildi",
        size: 115,
        cell: ({ row }) => (
          <ResultSelect
            value={row.original.obk_pulled}
            enabled={row.original.tracks_obk}
            onChange={(value) =>
              updateCell(row.original.id, "obk_pulled", value)
            }
          />
        ),
      },
      {
        id: "joint_done",
        header: "Ek Yapıldı",
        size: 110,
        cell: ({ row }) => (
          <ResultSelect
            value={row.original.joint_done}
            enabled
            onChange={(value) =>
              updateCell(row.original.id, "joint_done", value)
            }
          />
        ),
      },
      {
        id: "cable_pulled",
        header: "Kablo Çekildi",
        size: 125,
        cell: ({ row }) => (
          <ResultSelect
            value={row.original.cable_pulled}
            enabled
            onChange={(value) =>
              updateCell(row.original.id, "cable_pulled", value)
            }
          />
        ),
      },
      {
        id: "tracks_excavation",
        header: "Kazı Var",
        size: 100,
        cell: ({ row }) => (
          <PresenceSelect
            value={row.original.tracks_excavation}
            onChange={(value) =>
              updateCell(row.original.id, "tracks_excavation", value)
            }
          />
        ),
      },
      {
        id: "excavation_done",
        header: "Kazı Yapıldı",
        size: 115,
        cell: ({ row }) => (
          <ResultSelect
            value={row.original.excavation_done}
            enabled={row.original.tracks_excavation}
            onChange={(value) =>
              updateCell(row.original.id, "excavation_done", value)
            }
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Durum",
        size: 190,
        cell: ({ row }) => (
          <StatusSelect
            value={row.original.status}
            project={row.original}
            onChange={(value) => updateCell(row.original.id, "status", value)}
          />
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Son Güncelleme",
        size: 145,
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
    ],
    [typeLabels, updateCell]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 49,
    overscan: 10,
  });

  async function saveChanges() {
    if (dirtyIds.size === 0) return;

    const changedRows = rows
      .filter((project) => dirtyIds.has(project.id))
      .map(toUpdate);

    if (
      changedRows.some((project) => project.status === "completed") &&
      !window.confirm(
        "Tamamlandı durumuna alınan projeler otomatik olarak arşivlenecek. Devam edilsin mi?"
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const repository = new ProjectRepository(createClient());
      await repository.bulkUpdateTracking(changedRows);
      toast.success(`${changedRows.length} proje güncellendi`);
      setDirtyIds(new Set());
      onDirtyChange?.(0);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Projeler kaydedilemedi", {
        description:
          "00009 migration'ının çalıştırıldığını ve bağlantıyı kontrol edin.",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setRows(projects.map(normalizeProject));
    setDirtyIds(new Set());
    onDirtyChange?.(0);
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Proje Takip Tablosu</p>
          <p className="text-xs text-muted-foreground">
            {dirtyIds.size > 0
              ? `${dirtyIds.size} satırda kaydedilmemiş değişiklik var`
              : "Hücreleri düzenleyip toplu olarak kaydedebilirsiniz"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={dirtyIds.size === 0 || saving}
            onClick={resetChanges}
          >
            <RotateCcw className="h-4 w-4" />
            Geri Al
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={dirtyIds.size === 0 || saving}
            onClick={saveChanges}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Kaydet {dirtyIds.size > 0 ? `(${dirtyIds.size})` : ""}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[68vh] min-h-[320px] overflow-auto"
      >
        <table
          className="grid min-w-[1565px] text-sm"
          style={{ width: table.getTotalSize() }}
        >
          <thead className="sticky top-0 z-20 grid border-b bg-background shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="flex h-11 items-center border-r px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody
            className="relative grid"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              const isDirty = dirtyIds.has(row.original.id);
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={(node) => virtualizer.measureElement(node)}
                  className={`absolute flex w-full border-b transition-colors hover:bg-accent/30 ${
                    isDirty ? "bg-blue-50/70 dark:bg-blue-950/20" : ""
                  }`}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="flex min-h-12 items-center border-r px-2 last:border-r-0"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Filtrelere uygun proje bulunamadı.
          </div>
        )}
      </div>
    </>
  );
}

const PresenceSelect = memo(function PresenceSelect({
  value,
  disabled = false,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <select
      value={value ? "true" : "false"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "true")}
      className={`h-8 w-full rounded-lg border px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
      }`}
    >
      <option value="true">Evet</option>
      <option value="false">Hayır</option>
    </select>
  );
});

const ResultSelect = memo(function ResultSelect({
  value,
  enabled,
  onChange,
}: {
  value: boolean | null;
  enabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <select
      value={value === null ? "unset" : String(value)}
      disabled={!enabled}
      onChange={(event) =>
        onChange(
          event.target.value === "unset"
            ? null
            : event.target.value === "true"
        )
      }
      className={`h-8 w-full rounded-lg border px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${
        value === true
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : value === false
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            : "border-border bg-background"
      }`}
    >
      {BOOLEAN_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

function StatusSelect({
  value,
  project,
  onChange,
}: {
  value: ProjectStatus;
  project: Project;
  onChange: (value: ProjectStatus) => void;
}) {
  const derivedLabel =
    value === "excavation_permit_waiting"
      ? "Kazı Bekliyor"
      : value === "in_progress" &&
          project.tracks_obk &&
          project.obk_pulled !== true
        ? "OBK Bekliyor"
        : getStatusLabel(value);
  const colorClass =
    value === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "excavation_permit_waiting"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : value === "delayed"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : derivedLabel === "OBK Bekliyor"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : value === "in_progress"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ProjectStatus)}
      className={`h-8 w-full rounded-lg border px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring ${colorClass}`}
      title={derivedLabel}
    >
      <option value={value}>{derivedLabel}</option>
      {PROJECT_STATUSES.filter((status) => status.value !== value).map((status) => (
        <option key={status.value} value={status.value}>
          {status.value === "excavation_permit_waiting"
            ? "Kazı Bekliyor"
            : status.label}
        </option>
      ))}
    </select>
  );
}
