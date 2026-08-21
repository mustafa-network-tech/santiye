"use client";

import { useMemo, useState } from "react";
import {
  CarFront,
  ClipboardList,
  Download,
  FolderKanban,
  Loader2,
  Package,
  PackageCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { todayISODate } from "@/lib/constants/project";
import {
  ReportRepository,
  type ReportKey,
} from "@/modules/reports/report-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REPORTS: {
  key: ReportKey;
  title: string;
  description: string;
  icon: typeof FolderKanban;
}[] = [
  {
    key: "project_status",
    title: "Proje Durum Raporu",
    description: "Kategori ve duruma göre güncel proje dağılımı",
    icon: FolderKanban,
  },
  {
    key: "attendance",
    title: "Personel Puantaj Raporu",
    description: "Başlangıç tarihindeki ay için devam ve izin özeti",
    icon: Users,
  },
  {
    key: "team_performance",
    title: "Ekip Performansı",
    description: "Seçilen dönemde iş planındaki ekipler ve tamamlanan işler",
    icon: ClipboardList,
  },
  {
    key: "vehicle",
    title: "Araç Raporu",
    description: "Filo, kilometre, muayene ve sigorta özeti",
    icon: CarFront,
  },
  {
    key: "stock",
    title: "Stok Raporu",
    description: "Malzeme stok seviyeleri ve dönem hareketleri",
    icon: Package,
  },
  {
    key: "assignment",
    title: "Zimmet Raporu",
    description: "Depo, personel ve araçlardaki aktif ekipman zimmetleri",
    icon: PackageCheck,
  },
];

function monthStartISO() {
  const today = todayISODate();
  return `${today.slice(0, 7)}-01`;
}

export function ReportsManager() {
  const [startDate, setStartDate] = useState(monthStartISO);
  const [endDate, setEndDate] = useState(todayISODate);
  const [exporting, setExporting] = useState<ReportKey | null>(null);

  const rangeLabel = useMemo(() => {
    if (!startDate || !endDate) return "";
    return `${startDate} — ${endDate}`;
  }, [startDate, endDate]);

  async function handleExport(key: ReportKey, title: string) {
    if (!startDate || !endDate) {
      toast.error("Tarih aralığı seçin");
      return;
    }
    if (startDate > endDate) {
      toast.error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
      return;
    }
    setExporting(key);
    try {
      await new ReportRepository(createClient()).export(key, startDate, endDate);
      toast.success(`${title} indirildi`);
    } catch (error) {
      console.error(error);
      toast.error("Rapor oluşturulamadı", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Raporlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operasyonel özetleri Excel olarak dışa aktarın
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="report-start">Başlangıç Tarihi</Label>
            <Input
              id="report-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="report-end">Bitiş Tarihi</Label>
            <Input
              id="report-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground sm:w-48">
            Puantaj başlangıç ayını kullanır. Diğer raporlar bu aralığı esas alır.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const busy = exporting === report.key;
          return (
            <Card key={report.key}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={Boolean(exporting)}
                  onClick={() => handleExport(report.key, report.title)}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Excel İndir
                </Button>
                {rangeLabel && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {rangeLabel}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
