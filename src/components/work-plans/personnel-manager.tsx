"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Loader2, Pencil, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { Personnel } from "@/types/work-plan";
import type { PersonnelAttendanceSummary } from "@/types/attendance";
import { MONTH_NAMES } from "@/lib/constants/attendance";
import {
  personnelSchema,
  type PersonnelFormValues,
} from "@/lib/validations/work-plan";
import { createClient } from "@/lib/supabase/client";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
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
  attendanceSummary?: PersonnelAttendanceSummary | null;
};

export function PersonnelManager({
  initialPersonnel,
  attendanceSummary,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialPersonnel);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      is_active: true,
      notes: "",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      full_name: "",
      phone: "",
      is_active: true,
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(person: Personnel) {
    setEditing(person);
    form.reset({
      full_name: person.full_name,
      phone: person.phone ?? "",
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

    const repo = new PersonnelRepository(supabase);

    try {
      if (editing) {
        const updated = await repo.update(editing.id, {
          ...values,
          phone: values.phone || null,
          notes: values.notes || null,
          updated_by: user.id,
        });
        setItems((prev) =>
          prev
            .map((p) => (p.id === updated.id ? updated : p))
            .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"))
        );
        toast.success("Personel güncellendi");
      } else {
        const created = await repo.create({
          ...values,
          phone: values.phone || null,
          notes: values.notes || null,
          created_by: user.id,
          updated_by: user.id,
        });
        setItems((prev) =>
          [...prev, created].sort((a, b) =>
            a.full_name.localeCompare(b.full_name, "tr")
          )
        );
        toast.success("Personel eklendi");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Personel kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter((p) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      (p.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Personel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            İş planında kullanılacak personel listesi. Ekiplere kalıcı bağlı
            değildir.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Personel Ekle
        </Button>
      </div>

      {attendanceSummary && (
        <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/25">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {attendanceSummary.full_name} · Puantaj Notu
                </CardTitle>
                <CardDescription>
                  {MONTH_NAMES[attendanceSummary.month - 1]}{" "}
                  {attendanceSummary.year}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium leading-6">
              {attendanceSummary.worked} gün çalıştı,{" "}
              {attendanceSummary.absent} gün çalışmadı,{" "}
              {attendanceSummary.leave} gün izinli,{" "}
              {attendanceSummary.medical_report} gün raporlu ve{" "}
              {attendanceSummary.weekly_rest} gün hafta tatili.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Liste</CardTitle>
          <CardDescription>
            Aktif personeller günlük planda seçilebilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Ad, telefon veya not ara..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Personel bulunamadı.
              </p>
            ) : (
              filtered.map((person) => (
                <div
                  key={person.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    attendanceSummary?.personnel_id === person.id
                      ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300 dark:border-blue-800 dark:bg-blue-950/30"
                      : ""
                  }`}
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
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {person.phone || "Telefon yok"}
                        {person.notes ? ` · ${person.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(person)}
                  >
                    <Pencil className="h-4 w-4" />
                    Düzenle
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select
                value={form.watch("is_active") ? "active" : "passive"}
                onValueChange={(v) =>
                  form.setValue("is_active", v === "active")
                }
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
