"use client";

import {
  memo,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Loader2, Save, Search, Users } from "lucide-react";
import { toast } from "sonner";
import type {
  AttendanceChange,
  AttendanceStatus,
  AttendanceTotals,
  MonthlyAttendanceData,
  MonthlyAttendancePersonnel,
  PersonnelActivityFilter,
} from "@/types/attendance";
import {
  ATTENDANCE_STATUSES,
  MONTH_NAMES,
  getAttendanceMeta,
  getMonthDays,
} from "@/lib/constants/attendance";
import { createClient } from "@/lib/supabase/client";
import { AttendanceRepository } from "@/modules/attendance/attendance-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  initialData: MonthlyAttendanceData;
  initialSearch: string;
  initialActivityFilter: PersonnelActivityFilter;
};

const EMPTY_TOTALS: AttendanceTotals = {
  worked: 0,
  absent: 0,
  leave: 0,
  medical_report: 0,
  weekly_rest: 0,
};

const TOTAL_COLUMNS: { key: AttendanceStatus; shortLabel: string }[] = [
  { key: "worked", shortLabel: "Çalıştı" },
  { key: "absent", shortLabel: "Çalışmadı" },
  { key: "leave", shortLabel: "İzinli" },
  { key: "medical_report", shortLabel: "Raporlu" },
  { key: "weekly_rest", shortLabel: "HT" },
];

function cellKey(personnelId: string, date: string) {
  return `${personnelId}|${date}`;
}

export function MonthlyAttendanceTable({
  initialData,
  initialSearch,
  initialActivityFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [dirty, setDirty] = useState<Map<string, AttendanceStatus | null>>(
    new Map()
  );
  const [selectedPersonnel, setSelectedPersonnel] = useState<Set<string>>(
    new Set()
  );
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    return today.getFullYear() === initialData.year &&
      today.getMonth() + 1 === initialData.month
      ? today.getDate()
      : 1;
  });
  const [saving, setSaving] = useState(false);

  const days = useMemo(
    () => getMonthDays(initialData.year, initialData.month),
    [initialData.month, initialData.year]
  );

  const originalRecords = useMemo(() => {
    const records = new Map<string, AttendanceStatus>();
    initialData.personnel.forEach((personnel) => {
      personnel.records.forEach((record) => {
        records.set(cellKey(personnel.id, record.date), record.status);
      });
    });
    return records;
  }, [initialData.personnel]);

  useEffect(() => {
    setDirty(new Map());
    setSelectedPersonnel(new Set());
    setSearch(initialSearch);
    const today = new Date();
    setSelectedDay(
      today.getFullYear() === initialData.year &&
        today.getMonth() + 1 === initialData.month
        ? today.getDate()
        : 1
    );
  }, [initialData, initialSearch]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.size === 0) return;
      event.preventDefault();
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (dirty.size === 0) return;
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank") return;
      if (
        !window.confirm(
          "Kaydedilmemiş puantaj değişiklikleri var. Sayfadan ayrılmak istiyor musunuz?"
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [dirty.size]);

  function confirmDiscard() {
    return (
      dirty.size === 0 ||
      window.confirm(
        "Kaydedilmemiş puantaj değişiklikleri var. Sayfadan ayrılmak istiyor musunuz?"
      )
    );
  }

  function updateParams(updates: Record<string, string | null>) {
    if (!confirmDiscard()) return;
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function setAttendance(
    personnelId: string,
    date: string,
    status: AttendanceStatus | null
  ) {
    const key = cellKey(personnelId, date);
    const originalStatus = originalRecords.get(key) ?? null;
    setDirty((current) => {
      const next = new Map(current);
      if (status === originalStatus) next.delete(key);
      else next.set(key, status);
      return next;
    });
  }

  function applyToPersonnel(
    personnelIds: Iterable<string>,
    status: AttendanceStatus
  ) {
    const date = days[selectedDay - 1]?.isoDate;
    if (!date) return;
    Array.from(personnelIds).forEach((personnelId) =>
      setAttendance(personnelId, date, status)
    );
  }

  function togglePersonnel(id: string, checked: boolean) {
    setSelectedPersonnel((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedPersonnel(
      checked
        ? new Set(initialData.personnel.map((personnel) => personnel.id))
        : new Set()
    );
  }

  async function saveChanges() {
    const changes: AttendanceChange[] = Array.from(dirty.entries()).map(
      ([key, status]) => {
        const [personnelId, attendanceDate] = key.split("|");
        return {
          personnel_id: personnelId,
          attendance_date: attendanceDate,
          status,
        };
      }
    );
    if (changes.length === 0) return;

    setSaving(true);
    try {
      await new AttendanceRepository(createClient()).saveChanges(changes);
      toast.success("Puantaj başarıyla kaydedildi.");
      setDirty(new Map());
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Puantaj kaydedilemedi", {
        description:
          error instanceof Error
            ? error.message
            : "Kaydedilemeyen kayıtlar için bağlantıyı kontrol edin.",
      });
    } finally {
      setSaving(false);
    }
  }

  const allVisibleSelected =
    initialData.personnel.length > 0 &&
    initialData.personnel.every((personnel) =>
      selectedPersonnel.has(personnel.id)
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Puantaj</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aylık personel çalışma ve izin takibi
          </p>
        </div>

        <Button
          onClick={saveChanges}
          disabled={dirty.size === 0 || saving || isPending}
          className="min-w-32"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Kaydet {dirty.size > 0 ? `(${dirty.size})` : ""}
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-5">
          <Select
            value={String(initialData.month)}
            onValueChange={(month) =>
              updateParams({ month, year: String(initialData.year) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Ay" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((month, index) => (
                <SelectItem key={month} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(initialData.year)}
            onValueChange={(year) =>
              updateParams({ year, month: String(initialData.month) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Yıl" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 11 }, (_, index) => {
                const year = new Date().getFullYear() - 5 + index;
                return (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            value={initialActivityFilter}
            onValueChange={(value) =>
              updateParams({
                state: value as PersonnelActivityFilter,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Personel durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktif Personel</SelectItem>
              <SelectItem value="passive">Pasif Personel</SelectItem>
              <SelectItem value="all">Aktif + Pasif</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter")
                  updateParams({ q: search.trim() || null });
              }}
              placeholder="Personel ara..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(selectedDay)}
                onValueChange={(value) => setSelectedDay(Number(value))}
              >
                <SelectTrigger className="w-40">
                  <CalendarDays className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day.isoDate} value={String(day.day)}>
                      {String(day.day).padStart(2, "0")} {day.dayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {ATTENDANCE_STATUSES.map((status) => (
                <Button
                  key={status.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedPersonnel.size === 0}
                  onClick={() =>
                    applyToPersonnel(selectedPersonnel, status.value)
                  }
                  title={`Seçilen personelleri ${status.label} yap`}
                >
                  <span className="font-bold">{status.symbol}</span>
                  {status.label}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                applyToPersonnel(
                  initialData.active_personnel_ids,
                  "worked"
                )
              }
            >
              <Users className="h-4 w-4" />
              Tüm Aktifleri Çalıştı İşaretle
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
            {ATTENDANCE_STATUSES.map((status) => (
              <span key={status.value} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex h-6 min-w-7 items-center justify-center rounded border px-1 font-bold ${status.className}`}
                >
                  {status.symbol}
                </span>
                {status.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="max-h-[72vh] overflow-auto">
          <table
            className="border-separate border-spacing-0 text-sm"
            style={{ minWidth: 220 + days.length * 54 + 5 * 82 }}
          >
            <thead className="sticky top-0 z-30 bg-background">
              <tr>
                <th className="sticky left-0 z-40 min-w-[220px] border-b border-r bg-background px-3 py-2 text-left">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        toggleAllVisible(event.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Personel
                    </span>
                  </label>
                </th>
                {days.map((day) => (
                  <th
                    key={day.isoDate}
                    className={`min-w-[54px] border-b border-r px-1 py-2 text-center text-[11px] font-semibold ${
                      day.isSunday
                        ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300"
                        : "bg-background"
                    }`}
                  >
                    <span className="block">
                      {String(day.day).padStart(2, "0")}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {day.dayName}
                    </span>
                  </th>
                ))}
                {TOTAL_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className="min-w-[82px] border-b border-r bg-muted/70 px-2 py-2 text-center text-[10px] font-semibold uppercase"
                  >
                    {column.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {initialData.personnel.map((personnel) => (
                <AttendanceRow
                  key={personnel.id}
                  personnel={personnel}
                  days={days}
                  selected={selectedPersonnel.has(personnel.id)}
                  dirty={dirty}
                  originalRecords={originalRecords}
                  onToggle={togglePersonnel}
                  onChange={setAttendance}
                />
              ))}
            </tbody>
          </table>

          {initialData.personnel.length === 0 && (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Filtrelere uygun personel bulunamadı.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const AttendanceRow = memo(function AttendanceRow({
  personnel,
  days,
  selected,
  dirty,
  originalRecords,
  onToggle,
  onChange,
}: {
  personnel: MonthlyAttendancePersonnel;
  days: ReturnType<typeof getMonthDays>;
  selected: boolean;
  dirty: Map<string, AttendanceStatus | null>;
  originalRecords: Map<string, AttendanceStatus>;
  onToggle: (id: string, checked: boolean) => void;
  onChange: (
    personnelId: string,
    date: string,
    status: AttendanceStatus | null
  ) => void;
}) {
  const totals = useMemo(() => {
    const next = { ...EMPTY_TOTALS, ...personnel.totals };
    days.forEach((day) => {
      const key = cellKey(personnel.id, day.isoDate);
      if (!dirty.has(key)) return;
      const original = originalRecords.get(key);
      const current = dirty.get(key);
      if (original) next[original] = Math.max(0, next[original] - 1);
      if (current) next[current] += 1;
    });
    return next;
  }, [days, dirty, originalRecords, personnel]);

  return (
    <tr className={selected ? "bg-primary/5" : ""}>
      <td className="sticky left-0 z-20 min-w-[220px] border-b border-r bg-background px-3 py-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) =>
              onToggle(personnel.id, event.target.checked)
            }
            className="h-4 w-4 shrink-0 accent-primary"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {personnel.full_name}
            </span>
            <span className="block text-[10px] text-muted-foreground">
              {personnel.is_active ? "Aktif" : "Pasif"}
            </span>
          </span>
        </label>
      </td>

      {days.map((day) => {
        const key = cellKey(personnel.id, day.isoDate);
        const isDirty = dirty.has(key);
        const status = isDirty
          ? dirty.get(key) ?? null
          : originalRecords.get(key) ?? null;
        return (
          <td
            key={day.isoDate}
            className={`min-w-[54px] border-b border-r p-1 ${
              day.isSunday ? "bg-cyan-50/60 dark:bg-cyan-950/25" : ""
            }`}
          >
            <AttendanceCell
              status={status}
              dirty={isDirty}
              onChange={(nextStatus) =>
                onChange(personnel.id, day.isoDate, nextStatus)
              }
            />
          </td>
        );
      })}

      {TOTAL_COLUMNS.map((column) => (
        <td
          key={column.key}
          className="min-w-[82px] border-b border-r bg-muted/30 px-2 py-2 text-center font-semibold tabular-nums"
        >
          {totals[column.key]}
        </td>
      ))}
    </tr>
  );
});

const AttendanceCell = memo(function AttendanceCell({
  status,
  dirty,
  onChange,
}: {
  status: AttendanceStatus | null;
  dirty: boolean;
  onChange: (status: AttendanceStatus | null) => void;
}) {
  const meta = status ? getAttendanceMeta(status) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={meta ? `${meta.symbol} ${meta.label}` : "Puantaj girilmedi"}
          className={`flex h-10 w-full min-w-10 items-center justify-center rounded-md border text-sm font-bold transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring ${
            dirty
              ? "border-amber-400 bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-200"
              : meta
                ? meta.className
                : "border-transparent bg-background/70 text-muted-foreground hover:border-border"
          }`}
        >
          {meta?.symbol ?? "·"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {ATTENDANCE_STATUSES.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onSelect={() => onChange(item.value)}
            className="gap-2"
          >
            <span
              className={`inline-flex h-6 min-w-7 items-center justify-center rounded border px-1 font-bold ${item.className}`}
            >
              {item.symbol}
            </span>
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onSelect={() => onChange(null)}
          className="mt-1 border-t pt-2 text-destructive"
        >
          Kaydı Temizle
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
