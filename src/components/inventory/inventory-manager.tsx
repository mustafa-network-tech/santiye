"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  InventoryMaterial,
  InventoryMovement,
  InventoryMovementType,
} from "@/types/inventory";
import type { Project } from "@/types/project";
import {
  INVENTORY_UNITS,
  formatInventoryQuantity,
} from "@/lib/constants/inventory";
import {
  inventoryMaterialSchema,
  inventoryMovementSchema,
  type InventoryMaterialFormValues,
  type InventoryMovementFormValues,
} from "@/lib/validations/inventory";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MovementDialogState = {
  material: InventoryMaterial;
  type: InventoryMovementType;
} | null;

export function InventoryManager({
  initialMaterials,
  initialMovements,
  projects,
  readOnly = false,
}: {
  initialMaterials: InventoryMaterial[];
  initialMovements: InventoryMovement[];
  projects: Project[];
  readOnly?: boolean;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [movements, setMovements] = useState(initialMovements);
  const [search, setSearch] = useState("");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [movementDialog, setMovementDialog] =
    useState<MovementDialogState>(null);
  const [loading, setLoading] = useState(false);
  const [usageMode, setUsageMode] = useState<"project" | "manual">("project");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const materialForm = useForm<InventoryMaterialFormValues>({
    resolver: zodResolver(inventoryMaterialSchema),
    defaultValues: {
      material_name: "",
      material_code: "",
      unit: "piece",
      initial_quantity: 1,
      notes: "",
    },
  });
  const movementForm = useForm<InventoryMovementFormValues>({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: {
      quantity: 1,
      usage_location: "",
      description: "",
    },
  });

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return materials;
    return materials.filter((material) =>
      [
        material.material_name,
        material.material_code ?? "",
        material.notes ?? "",
      ].some((value) => value.toLocaleLowerCase("tr-TR").includes(query))
    );
  }, [materials, search]);
  const groupedMaterials = useMemo(() => {
    const groups = new Map<string, { name: string; materials: InventoryMaterial[] }>();
    for (const material of filteredMaterials) {
      const key = material.material_name.trim().toLocaleLowerCase("tr-TR");
      const group = groups.get(key);
      if (group) group.materials.push(material);
      else groups.set(key, { name: material.material_name.trim(), materials: [material] });
    }
    return [...groups.values()]
      .map((group) => ({ ...group, materials: group.materials.sort((a, b) => (a.material_code || "").localeCompare(b.material_code || "", "tr")) }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [filteredMaterials]);

  function openNewMaterial() {
    materialForm.reset({
      material_name: "",
      material_code: "",
      unit: "piece",
      initial_quantity: 1,
      notes: "",
    });
    setMaterialDialogOpen(true);
  }

  function openMovement(
    material: InventoryMaterial,
    type: InventoryMovementType
  ) {
    movementForm.reset({
      quantity: 1,
      usage_location: "",
      description: "",
    });
    setUsageMode("project");
    setSelectedProjectId("");
    setMovementDialog({ material, type });
  }

  async function reloadMovements(repository: InventoryRepository) {
    setMovements(await repository.listMovements());
  }

  async function createMaterial(values: InventoryMaterialFormValues) {
    setLoading(true);
    try {
      const repository = new InventoryRepository(createClient());
      const created = await repository.createMaterial(values);
      setMaterials((current) =>
        [...current, created].sort((a, b) =>
          a.material_name.localeCompare(b.material_name, "tr")
        )
      );
      await reloadMovements(repository);
      setMaterialDialogOpen(false);
      toast.success("Malzeme ve ilk stok girişi kaydedildi");
    } catch (error) {
      console.error(error);
      toast.error("Malzeme kaydedilemedi", {
        description:
          (error as { code?: string })?.code === "23505"
            ? "Bu malzeme ID zaten kullanılıyor."
            : (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function recordMovement(values: InventoryMovementFormValues) {
    if (!movementDialog) return;
    if (
      movementDialog.type === "out" &&
      !values.usage_location?.trim()
    ) {
      movementForm.setError("usage_location", {
        message: "Kullanım yeri zorunlu",
      });
      return;
    }
    if (
      movementDialog.material.unit === "piece" &&
      !Number.isInteger(values.quantity)
    ) {
      movementForm.setError("quantity", {
        message: "Adet miktarı tam sayı olmalı",
      });
      return;
    }

    setLoading(true);
    try {
      const repository = new InventoryRepository(createClient());
      const updated = await repository.recordMovement({
        material_id: movementDialog.material.id,
        movement_type: movementDialog.type,
        ...values,
      });
      setMaterials((current) =>
        current.map((material) =>
          material.id === updated.id ? updated : material
        )
      );
      await reloadMovements(repository);
      setMovementDialog(null);
      toast.success(
        movementDialog.type === "out"
          ? "Malzeme stoktan düşüldü"
          : "Stok girişi kaydedildi"
      );
    } catch (error) {
      console.error(error);
      toast.error("Stok hareketi kaydedilemedi", {
        description: (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedUnit = materialForm.watch("unit");
  const movementUnit = movementDialog?.material.unit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Malzeme Stok
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Malzeme bakiyeleri, girişler ve kullanım kayıtları
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openNewMaterial}>
            <Plus className="h-4 w-4" />
            Yeni Malzeme
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Güncel Stoklar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Malzeme cinsi veya ID ara..."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupedMaterials.map((group) => (
              <div key={group.name.toLocaleLowerCase("tr-TR")} className="rounded-2xl border p-4">
                <div className="flex items-start gap-3 border-b pb-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Boxes className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.materials.length} farklı Malzeme ID</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-3">{group.materials.map((material) => <div key={material.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3"><span className="text-sm">ID: <strong>{material.material_code || "—"}</strong></span><Badge>{formatInventoryQuantity(material.stock_quantity, material.unit)}</Badge></div>
                  {material.notes && <p className="mt-1 text-xs text-muted-foreground">{material.notes}</p>}
                  {!readOnly && <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => openMovement(material, "in")}><ArrowDownToLine className="h-4 w-4" />Stok Ekle</Button><Button size="sm" onClick={() => openMovement(material, "out")} disabled={Number(material.stock_quantity) <= 0}><ArrowUpFromLine className="h-4 w-4" />Stoktan Düş</Button></div>}
                </div>)}</div>
              </div>
            ))}
          </div>
          {groupedMaterials.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Malzeme bulunamadı.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son Stok Hareketleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tarih</th>
                  <th className="px-3 py-2 font-medium">Malzeme</th>
                  <th className="px-3 py-2 font-medium">İşlem</th>
                  <th className="px-3 py-2 font-medium">Miktar</th>
                  <th className="px-3 py-2 font-medium">Kullanım Yeri</th>
                  <th className="px-3 py-2 font-medium">Kalan Stok</th>
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateTime(movement.created_at)}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {movement.material?.material_name ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        className={
                          movement.movement_type === "in"
                            ? "bg-emerald-600"
                            : "bg-orange-600"
                        }
                      >
                        {movement.movement_type === "in" ? "Giriş" : "Kullanım"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {movement.material
                        ? formatInventoryQuantity(
                            movement.quantity,
                            movement.material.unit
                          )
                        : movement.quantity}
                    </td>
                    <td className="px-3 py-3">
                      {movement.usage_location || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {movement.material
                        ? formatInventoryQuantity(
                            movement.balance_after,
                            movement.material.unit
                          )
                        : movement.balance_after}
                    </td>
                    <td className="px-3 py-3">
                      {movement.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {movements.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Henüz stok hareketi yok.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Malzeme ve İlk Stok Girişi</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={materialForm.handleSubmit(createMaterial)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Malzeme Cinsi"
                error={materialForm.formState.errors.material_name?.message}
              >
                <Input {...materialForm.register("material_name")} />
              </Field>
              <Field
                label="Malzeme ID (Zorunlu Değil)"
                error={materialForm.formState.errors.material_code?.message}
              >
                <Input {...materialForm.register("material_code")} />
              </Field>
              <Field label="Birim">
                <Select
                  value={selectedUnit}
                  onValueChange={(value: "piece" | "meter" | "kilogram") =>
                    materialForm.setValue("unit", value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Başlangıç Miktarı"
                error={materialForm.formState.errors.initial_quantity?.message}
              >
                <Input
                  type="number"
                  min="0"
                  step={selectedUnit === "piece" ? "1" : "0.001"}
                  {...materialForm.register("initial_quantity")}
                />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label>Not</Label>
                <Textarea {...materialForm.register("notes")} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Malzemeyi Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(movementDialog)}
        onOpenChange={(open) => !open && setMovementDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementDialog?.type === "out" ? "Stoktan Düş" : "Stok Ekle"}
            </DialogTitle>
          </DialogHeader>
          {movementDialog && (
            <form
              onSubmit={movementForm.handleSubmit(recordMovement)}
              className="space-y-4"
            >
              <div className="rounded-xl bg-muted p-3 text-sm">
                <p className="font-semibold">
                  {movementDialog.material.material_name}
                </p>
                <p className="text-muted-foreground">
                  Mevcut stok:{" "}
                  {formatInventoryQuantity(
                    movementDialog.material.stock_quantity,
                    movementDialog.material.unit
                  )}
                </p>
              </div>
              <Field
                label="Miktar"
                error={movementForm.formState.errors.quantity?.message}
              >
                <Input
                  type="number"
                  min="0"
                  max={
                    movementDialog.type === "out"
                      ? movementDialog.material.stock_quantity
                      : undefined
                  }
                  step={movementUnit === "piece" ? "1" : "0.001"}
                  {...movementForm.register("quantity")}
                />
              </Field>
              {movementDialog.type === "out" && (
                <div className="space-y-4">
                  <Field label="Kullanım Yeri Türü">
                    <Select value={usageMode} onValueChange={(value: "project" | "manual") => { setUsageMode(value); setSelectedProjectId(""); movementForm.setValue("usage_location", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="project">Projeden Seç</SelectItem><SelectItem value="manual">Manuel Alan Gir</SelectItem></SelectContent></Select>
                  </Field>
                  {usageMode === "project" ? <Field label="Proje ID / Proje" error={movementForm.formState.errors.usage_location?.message}>
                    <Select value={selectedProjectId} onValueChange={(value) => { const project = projects.find((item) => item.id === value); setSelectedProjectId(value); movementForm.setValue("usage_location", project ? `${project.project_code} · ${project.name}` : "", { shouldValidate: true }); }}><SelectTrigger><SelectValue placeholder="Proje seçin" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_code} · {project.name}</SelectItem>)}</SelectContent></Select>
                  </Field> : <Field label="Manuel Kullanım Alanı" error={movementForm.formState.errors.usage_location?.message}><Input placeholder="Proje ID, şantiye veya kullanım alanı" {...movementForm.register("usage_location")} /></Field>}
                </div>
              )}
              <Field label="Açıklama (Zorunlu Değil)">
                <Textarea {...movementForm.register("description")} />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
