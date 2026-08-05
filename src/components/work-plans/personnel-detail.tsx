"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  CircleOff,
  FileHeart,
  Phone,
  ShieldCheck,
  Umbrella,
  UserRound,
} from "lucide-react";
import type { Personnel } from "@/types/work-plan";
import type { PersonnelAttendanceSummary } from "@/types/attendance";
import { MONTH_NAMES } from "@/lib/constants/attendance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  personnel: Personnel;
  summary: PersonnelAttendanceSummary;
  year: number;
  month: number;
};

export function PersonnelDetail({
  personnel,
  summary,
  year,
  month,
}: Props) {
  const router = useRouter();

  function updatePeriod(nextYear: number, nextMonth: number) {
    router.push(
      `/personnel/${personnel.id}?year=${nextYear}&month=${nextMonth}`
    );
  }

  const summaryCards = [
    {
      label: "Çalıştığı Gün (Mesai)",
      value: summary.worked,
      icon: CalendarCheck,
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40",
    },
    {
      label: "Çalışmadığı Gün",
      value: summary.absent,
      icon: CircleOff,
      className: "bg-red-50 text-red-700 dark:bg-red-950/40",
    },
    {
      label: "Kullandığı İzin",
      value: summary.leave,
      icon: Umbrella,
      className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40",
    },
    {
      label: "Raporlu Gün",
      value: summary.medical_report,
      icon: FileHeart,
      className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40",
    },
    {
      label: "Hafta Tatili",
      value: summary.weekly_rest,
      icon: ShieldCheck,
      className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link href="/personnel">
            <ArrowLeft className="h-4 w-4" />
            Personel Listesine Dön
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UserRound className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {personnel.full_name}
                </h1>
                <Badge
                  className={
                    personnel.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {personnel.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {personnel.phone || "Telefon numarası girilmemiş"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={String(month)}
              onValueChange={(value) => updatePeriod(year, Number(value))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, index) => (
                  <SelectItem key={name} value={String(index + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(value) => updatePeriod(Number(value), month)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, index) => {
                  const optionYear = new Date().getFullYear() - 5 + index;
                  return (
                    <SelectItem
                      key={optionYear}
                      value={String(optionYear)}
                    >
                      {optionYear}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-semibold">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.className}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {MONTH_NAMES[month - 1]} {year} Puantaj Özeti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">
            {personnel.full_name}, bu ay <strong>{summary.worked} gün</strong>{" "}
            çalıştı, <strong>{summary.leave} gün</strong> izin kullandı,{" "}
            <strong>{summary.medical_report} gün</strong> raporlu ve{" "}
            <strong>{summary.weekly_rest} gün</strong> hafta tatilindeydi.
          </p>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Personel Notu
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {personnel.notes?.trim() || "Personel notu girilmemiş."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
