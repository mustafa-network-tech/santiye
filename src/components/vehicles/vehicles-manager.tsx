"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, Download, Gauge, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle } from "@/types/vehicle";
import type { InventoryCustodyBalance } from "@/types/inventory";
import { formatInventoryQuantity } from "@/lib/constants/inventory";
import { downloadVehicleEquipmentWord } from "@/lib/vehicle-equipment-word";
import {
  vehicleSchema,
  type VehicleFormValues,
} from "@/lib/validations/vehicle";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { VehicleRepository } from "@/modules/vehicles/vehicle-repository";
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
import { Textarea } from "@/components/ui/textarea";

export function VehiclesManager({
  initialVehicles,
  equipmentBalances,
  readOnly = false,
}: {
  initialVehicles: Vehicle[];
  equipmentBalances: InventoryCustodyBalance[];
  readOnly?: boolean;
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: "",
      brand: "",
      model: "",
      current_km: 0,
      inspection_date: "",
      insurance_date: "",
      notes: "",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      plate: "",
      brand: "",
      model: "",
      current_km: 0,
      inspection_date: "",
      insurance_date: "",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    form.reset({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      current_km: vehicle.current_km,
      inspection_date: vehicle.inspection_date ?? "",
      insurance_date: vehicle.insurance_date ?? "",
      notes: vehicle.notes ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: VehicleFormValues) {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      const repository = new VehicleRepository(supabase);
      if (editing) {
        const updated = await repository.update(editing.id, {
          ...values,
          updated_by: user.id,
        });
        setVehicles((current) =>
          current
            .map((vehicle) => (vehicle.id === updated.id ? updated : vehicle))
            .sort((a, b) => a.plate.localeCompare(b.plate, "tr"))
        );
        toast.success("Araç güncellendi");
      } else {
        const created = await repository.create({
          ...values,
          created_by: user.id,
          updated_by: user.id,
        });
        setVehicles((current) =>
          [...current, created].sort((a, b) =>
            a.plate.localeCompare(b.plate, "tr")
          )
        );
        toast.success("Araç eklendi");
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Araç kaydedilemedi", {
        description:
          (error as { code?: string })?.code === "23505"
            ? "Bu plaka zaten kayıtlı."
            : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  const query = search.trim().toLocaleLowerCase("tr-TR");
  const filtered = vehicles.filter((vehicle) =>
    [vehicle.plate, vehicle.brand, vehicle.model, vehicle.notes ?? ""].some(
      (value) => value.toLocaleLowerCase("tr-TR").includes(query)
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Araçlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            İş planında kullanılacak şirket araçları
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Araç Ekle
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Şirket Araçları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Plaka, marka veya model ara..."
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((vehicle) => (
              <div key={vehicle.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <CarFront className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{vehicle.plate}</p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEdit(vehicle)}
                      aria-label="Aracı düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    {vehicle.current_km.toLocaleString("tr-TR")} km
                  </span>
                  <span>Muayene: {formatDate(vehicle.inspection_date)}</span>
                  <span>Sigorta: {formatDate(vehicle.insurance_date)}</span>
                  <span className="text-muted-foreground">
                    {vehicle.notes || "Not yok"}
                  </span>
                </div>
                {(() => {
                  const vehicleEquipment = equipmentBalances.filter(
                    (balance) => balance.holder_id === vehicle.id
                  );
                  return (
                    <div className="mt-4 border-t pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Zimmetli Ekipmanlar</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={vehicleEquipment.length === 0}
                          onClick={() => downloadVehicleEquipmentWord(vehicle, vehicleEquipment)}
                        >
                          <Download className="h-4 w-4" /> Word
                        </Button>
                      </div>
                      {vehicleEquipment.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm">
                          {vehicleEquipment.map((balance) => (
                            <li key={balance.id} className="flex justify-between gap-3 rounded-md bg-muted px-2 py-1.5">
                              <span>{balance.material?.material_name || "—"}</span>
                              <strong>{balance.material ? formatInventoryQuantity(balance.quantity, balance.material.unit) : balance.quantity}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Bu araçta zimmetli ekipman yok.</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Araç bulunamadı.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Aracı Düzenle" : "Yeni Araç"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plate">Araç Plakası</Label>
                <Input id="plate" {...form.register("plate")} />
                {form.formState.errors.plate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.plate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_km">Kilometre</Label>
                <Input
                  id="current_km"
                  type="number"
                  min={0}
                  {...form.register("current_km")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marka</Label>
                <Input id="brand" {...form.register("brand")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" {...form.register("model")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection_date">Muayene Tarihi</Label>
                <Input
                  id="inspection_date"
                  type="date"
                  {...form.register("inspection_date")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_date">Sigorta Tarihi</Label>
                <Input
                  id="insurance_date"
                  type="date"
                  {...form.register("insurance_date")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vehicle_notes">Not</Label>
                <Textarea id="vehicle_notes" {...form.register("notes")} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
