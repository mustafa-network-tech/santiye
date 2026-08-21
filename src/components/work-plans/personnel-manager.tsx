"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { Personnel } from "@/types/work-plan";
import type { Vehicle } from "@/types/vehicle";
import {
  personnelSchema,
  type PersonnelFormValues,
} from "@/lib/validations/work-plan";
import { createClient } from "@/lib/supabase/client";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import {
  downloadPersonnelExcel,
  downloadPersonnelWord,
} from "@/lib/personnel-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initialPersonnel: Personnel[];
  assignedVehicles?: Vehicle[];
  readOnly?: boolean;
};

export function PersonnelManager({
  initialPersonnel,
  assignedVehicles = [],
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialPersonnel);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [showPassive, setShowPassive] = useState(false);

  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      full_name: "",
      job_title: "",
      phone: "",
      tc_identity_number: "",
      employment_start_date: "",
      employment_end_date: "",
      monthly_salary: 0,
      is_active: true,
      notes: "",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      full_name: "",
      job_title: "",
      phone: "",
      tc_identity_number: "",
      employment_start_date: "",
      employment_end_date: "",
      monthly_salary: 0,
      is_active: true,
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(person: Personnel) {
    setEditing(person);
    form.reset({
      full_name: person.full_name,
      job_title: person.job_title ?? "",
      phone: person.phone ?? "",
      tc_identity_number: person.tc_identity_number ?? "",
      employment_start_date: person.employment_start_date ?? "",
      employment_end_date: person.employment_end_date ?? "",
      monthly_salary: person.monthly_salary ?? 0,
      is_active: person.is_active,
      notes: person.notes ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: PersonnelFormValues) {
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

    if (editing?.is_active && !values.is_active) {
      try {
        const custody = await new InventoryRepository(
          supabase
        ).listPersonnelCustodyBalances(editing.id);
        if (custody.length > 0) {
          toast.error("Personel pasife alınamaz", {
            description: `Üzerinde ${custody.length} aktif malzeme zimmeti var. Önce zimmetleri başka personele/ekibe aktarın veya şantiye deposuna iade edin.`,
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error(error);
        toast.error("Personel zimmetleri kontrol edilemedi");
        setLoading(false);
        return;
      }
    }

    const repo = new PersonnelRepository(supabase);

    try {
      if (editing) {
        const updated = await repo.update(editing.id, {
          ...values,
          job_title: values.job_title || null,
          phone: values.phone || null,
          tc_identity_number: values.tc_identity_number || null,
          notes: values.notes || null,
          updated_by: user.id,
        });
        setItems((prev) =>
          sortByCreatedAtDesc(
            prev.map((p) => (p.id === updated.id ? updated : p))
          )
        );
        toast.success("Personel güncellendi");
      } else {
        const created = await repo.create({
          ...values,
          job_title: values.job_title || null,
          phone: values.phone || null,
          tc_identity_number: values.tc_identity_number || null,
          notes: values.notes || null,
          created_by: user.id,
          updated_by: user.id,
        });
        setItems((prev) => sortByCreatedAtDesc([...prev, created]));
        toast.success("Personel eklendi");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Personel kaydedilemedi", {
        description: (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const activeCount = items.filter((person) => person.is_active).length;
  const passiveCount = items.length - activeCount;
  const filtered = sortByCreatedAtDesc(items).filter((p) => {
    if (p.is_active === showPassive) return false;
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.job_title ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      (p.tc_identity_number ?? "").includes(q) ||
      (p.notes ?? "").toLowerCase().includes(q)
    );
  });

  function printPersonnelList() {
    const rows = filtered
      .map(
        (person) =>
          `<tr><td>${escapeHtml(person.full_name)}</td><td>${escapeHtml(
            person.tc_identity_number || "—"
          )}</td><td>${escapeHtml(person.job_title || "—")}</td><td>${escapeHtml(
            person.phone || "—"
          )}</td></tr>`
      )
      .join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast.error("Yazdırma penceresi açılamadı");
      return;
    }
    printWindow.document.write(
      `<!doctype html><html><head><title>Personel Listesi</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eee}</style></head><body><h1>AZG İLETİŞİM ŞANTİYE — Personel Listesi</h1><table><thead><tr><th>Ad Soyad</th><th>TC Kimlik No</th><th>Görev</th><th>Telefon</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function exportPersonnelExcel() {
    try {
      await downloadPersonnelExcel(
        filtered,
        `personel-listesi-${showPassive ? "pasif" : "aktif"}.xlsx`
      );
    } catch (error) {
      console.error(error);
      toast.error("Personel Excel dosyası oluşturulamadı");
    }
  }

  async function exportPersonnelWord() {
    try {
      await downloadPersonnelWord(
        filtered,
        `personel-listesi-${showPassive ? "pasif" : "aktif"}.docx`
      );
    } catch (error) {
      console.error(error);
      toast.error("Personel Word dosyası oluşturulamadı");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {showPassive ? "Pasif Personeller" : "Aktif Personeller"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showPassive ? passiveCount : activeCount} personel · Yeni
            kayıttan eskiye sıralı
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowPassive((current) => !current);
              setFilter("");
            }}
          >
            {showPassive
              ? `Aktif Personeller (${activeCount})`
              : `Pasif Personeller (${passiveCount})`}
          </Button>
          <Button variant="outline" onClick={printPersonnelList}>
            <Printer className="h-4 w-4" />
            Listeyi Yazdır
          </Button>
          <Button
            variant="outline"
            onClick={exportPersonnelExcel}
            disabled={filtered.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel İndir
          </Button>
          <Button
            variant="outline"
            onClick={exportPersonnelWord}
            disabled={filtered.length === 0}
          >
            <FileText className="h-4 w-4" />
            Word İndir
          </Button>
          {!readOnly && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Personel Ekle
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {showPassive ? "Pasif Personeller" : "Aktif Personeller"}
          </CardTitle>
          <CardDescription>
            {showPassive
              ? "Pasife alınmış personellerin geçmiş kayıtları korunur."
              : "Aktif personeller günlük planda seçilebilir."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Ad, görev, telefon, TC Kimlik No veya not ara..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Personel bulunamadı.
              </p>
            ) : (
              filtered.map((person) => {
                const assignedVehicle = assignedVehicles.find(
                  (vehicle) => vehicle.assigned_personnel_id === person.id
                );
                return (
                <div
                  key={person.id}
                  className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-muted p-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/personnel/${person.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {person.full_name}
                        </Link>
                        <Badge
                          className={
                            person.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {person.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                        {assignedVehicle && (
                          <Badge className="border bg-background text-foreground">
                            {assignedVehicle.plate}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {person.job_title?.trim() || "Görev girilmemiş"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        TC: {person.tc_identity_number || "—"} · {person.phone || "Telefon yok"}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(person)}
                    >
                      <Pencil className="h-4 w-4" />
                      Düzenle
                    </Button>
                  )}
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Personeli Düzenle" : "Yeni Personel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input id="full_name" {...form.register("full_name")} />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Aylık Maaş (₺)</Label>
              <Input
                id="monthly_salary"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                {...form.register("monthly_salary")}
              />
              {form.formState.errors.monthly_salary && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.monthly_salary.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Görev Bilgisi (Opsiyonel)</Label>
              <Input
                id="job_title"
                placeholder="Örn. Kepçe Operatörü"
                {...form.register("job_title")}
              />
              {form.formState.errors.job_title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.job_title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc_identity_number">TC Kimlik No</Label>
              <Input
                id="tc_identity_number"
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                {...form.register("tc_identity_number")}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value
                    .replace(/\D/g, "")
                    .slice(0, 11);
                }}
              />
              {form.formState.errors.tc_identity_number && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.tc_identity_number.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employment_start_date">İşe Giriş Tarihi</Label>
              <Input
                id="employment_start_date"
                type="date"
                {...form.register("employment_start_date")}
              />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select
                value={form.watch("is_active") ? "active" : "passive"}
                onValueChange={(v) => {
                  const isActive = v === "active";
                  form.setValue("is_active", isActive);
                  if (isActive) form.setValue("employment_end_date", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!form.watch("is_active") && (
              <div className="space-y-2">
                <Label htmlFor="employment_end_date">
                  İşten Ayrılış Tarihi
                </Label>
                <Input
                  id="employment_end_date"
                  type="date"
                  {...form.register("employment_end_date")}
                />
                {form.formState.errors.employment_end_date && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.employment_end_date.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Not</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="animate-spin" />}
              Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!
  );
}

function sortByCreatedAtDesc(personnel: Personnel[]) {
  return [...personnel].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
}

