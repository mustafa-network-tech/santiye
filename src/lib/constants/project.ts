export const FIXED_PROJECT_TYPES = [
  { key: "GF", label: "GF" },
  { key: "BGFD", label: "BGFD" },
  { key: "BF", label: "BF" },
  { key: "Kurumsal", label: "Kurumsal" },
] as const;

export const CUSTOM_PROJECT_TYPE_KEYS = [
  "custom_1",
  "custom_2",
  "custom_3",
  "custom_4",
] as const;

export type FixedProjectTypeKey = (typeof FIXED_PROJECT_TYPES)[number]["key"];
export type CustomProjectTypeKey = (typeof CUSTOM_PROJECT_TYPE_KEYS)[number];

export const PROJECT_STATUSES = [
  {
    value: "waiting",
    label: "Bekliyor",
    dateKey: "waiting_at" as const,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  {
    value: "in_progress",
    label: "Devam Ediyor",
    dateKey: "in_progress_at" as const,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    value: "excavation_permit_waiting",
    label: "Kazı İzni Bekliyor",
    dateKey: "excavation_permit_waiting_at" as const,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    value: "delayed",
    label: "Gecikmiş",
    dateKey: "delayed_at" as const,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    value: "completed",
    label: "Tamamlandı",
    dateKey: "completed_at" as const,
    dateLabel: "Bitiş Tarihi",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
export type StageDateKey = (typeof PROJECT_STATUSES)[number]["dateKey"];

export const CABLE_OPTIONS = [
  { value: "true", label: "Kablo çekildi" },
  { value: "false", label: "Kablo çekilmedi" },
] as const;

export const JOINT_OPTIONS = [
  { value: "true", label: "Ek yapıldı" },
  { value: "false", label: "Ek yapılmadı" },
] as const;

export const DEFAULT_CUSTOM_PROJECT_TYPES: Record<CustomProjectTypeKey, string> =
  {
    custom_1: "Özel Kategori 1",
    custom_2: "Özel Kategori 2",
    custom_3: "Özel Kategori 3",
    custom_4: "Özel Kategori 4",
  };

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export function getStatusLabel(status: string): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function getStatusColor(status: string): string {
  return (
    PROJECT_STATUSES.find((s) => s.value === status)?.color ??
    "bg-slate-100 text-slate-700"
  );
}

export function getStageDateKey(status: ProjectStatus): StageDateKey {
  return (
    PROJECT_STATUSES.find((s) => s.value === status)?.dateKey ?? "waiting_at"
  );
}

export function getStageDateLabel(status: ProjectStatus): string {
  const meta = PROJECT_STATUSES.find((s) => s.value === status);
  if (meta && "dateLabel" in meta && meta.dateLabel) return meta.dateLabel as string;
  return `${meta?.label ?? "Aşama"} Tarihi`;
}


export function formatBooleanChoice(
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string
): string {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  return "—";
}

export function todayISODate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}
