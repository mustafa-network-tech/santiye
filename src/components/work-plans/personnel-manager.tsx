"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import type { Personnel } from "@/types/work-plan";
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
};

export function PersonnelManager({ initialPersonnel }: Props) {
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
                  className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-muted p-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{person.full_name}</p>
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
