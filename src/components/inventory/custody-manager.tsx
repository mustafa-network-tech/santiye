"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Loader2,
  Plus,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import type { Personnel } from "@/types/work-plan";
import type {
  CustodyLocationType,
  CustodyTeamOption,
  InventoryCustodyBalance,
  InventoryCustodyMovement,
  InventoryMaterial,
} from "@/types/inventory";
import { formatInventoryQuantity } from "@/lib/constants/inventory";
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

type TransferSource =
  | { type: "warehouse"; balance: null }
  | {
      type: "personnel" | "team";
      balance: InventoryCustodyBalance;
    };

export function CustodyManager({
  initialMaterials,
  initialBalances,
  initialMovements,
  personnel,
  teams,
  readOnly = false,
}: {
  initialMaterials: InventoryMaterial[];
  initialBalances: InventoryCustodyBalance[];
  initialMovements: InventoryCustodyMovement[];
  personnel: Personnel[];
  teams: CustodyTeamOption[];
  readOnly?: boolean;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [balances, setBalances] = useState(initialBalances);
  const [movements, setMovements] = useState(initialMovements);
  const [source, setSource] = useState<TransferSource | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [targetType, setTargetType] =
    useState<CustodyLocationType>("personnel");
  const [targetId, setTargetId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const activePersonnel = personnel.filter((person) => person.is_active);

  const totals = useMemo(
    () =>
      materials.map((material) => {
        const custodyQuantity = balances
          .filter((balance) => balance.material_id === material.id)
          .reduce((sum, balance) => sum + Number(balance.quantity), 0);
        return {
          material,
          custodyQuantity,
          totalQuantity: Number(material.stock_quantity) + custodyQuantity,
        };
      }),
    [balances, materials]
  );

  function openWarehouseAssignment() {
    setSource({ type: "warehouse", balance: null });
    setMaterialId("");
    setTargetType("personnel");
    setTargetId("");
    setQuantity("1");
    setNotes("");
  }

  function openTransfer(balance: InventoryCustodyBalance) {
    setSource({ type: balance.holder_type, balance });
    setMaterialId(balance.material_id);
    setTargetType("warehouse");
    setTargetId("");
    setQuantity("1");
    setNotes("");
  }

  async function reload(repository: InventoryRepository) {
    const [nextMaterials, nextBalances, nextMovements] = await Promise.all([
      repository.listMaterials(),
      repository.listCustodyBalances(),
      repository.listCustodyMovements(),
    ]);
    setMaterials(nextMaterials);
    setBalances(nextBalances);
    setMovements(nextMovements);
  }

  async function submitTransfer() {
    if (!source || !materialId) return;
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Geçerli bir miktar girin");
      return;
    }
    if (targetType !== "warehouse" && !targetId) {
      toast.error("Hedef personel veya ekip seçin");
      return;
    }
    const material = materials.find((item) => item.id === materialId);
    if (material?.unit === "piece" && !Number.isInteger(amount)) {
      toast.error("Adet miktarı tam sayı olmalıdır");
      return;
    }

    setLoading(true);
    try {
      const repository = new InventoryRepository(createClient());
      await repository.transferCustody({
        material_id: materialId,
        quantity: amount,
        from_type: source.type,
        from_id: source.balance?.holder_id ?? null,
        to_type: targetType,
        to_id: targetType === "warehouse" ? null : targetId,
        notes,
      });
      await reload(repository);
      setSource(null);
      toast.success(
        targetType === "warehouse"
          ? "Malzeme şantiye deposuna iade edildi"
          : "Malzeme zimmeti kaydedildi"
      );
    } catch (error) {
      console.error(error);
      toast.error("Zimmet işlemi kaydedilemedi", {
        description: (error as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedMaterial = materials.find((item) => item.id === materialId);
  const maxQuantity =
    source?.type === "warehouse"
      ? Number(selectedMaterial?.stock_quantity ?? 0)
      : Number(source?.balance?.quantity ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Malzeme Zimmet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Şantiye deposu, personel ve ekipler arasındaki malzeme takibi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory">
              <Warehouse className="h-4 w-4" />
              Şantiye Deposu
            </Link>
          </Button>
          {!readOnly && (
            <Button onClick={openWarehouseAssignment}>
              <Plus className="h-4 w-4" />
              Yeni Zimmet
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toplam Malzemeler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {totals.map(({ material, custodyQuantity, totalQuantity }) => (
            <div key={material.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{material.material_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {material.material_code || "Malzeme ID yok"}
                  </p>
                </div>
                <Badge>
                  Toplam:{" "}
                  {formatInventoryQuantity(totalQuantity, material.unit)}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span>
                  Depo:{" "}
                  <strong>
                    {formatInventoryQuantity(
                      material.stock_quantity,
                      material.unit
                    )}
                  </strong>
                </span>
                <span>
                  Zimmette:{" "}
                  <strong>
                    {formatInventoryQuantity(custodyQuantity, material.unit)}
                  </strong>
                </span>
              </div>
            </div>
          ))}
          {totals.length === 0 && (
            <p className="py-8 text-sm text-muted-foreground">
              Önce Şantiye Deposu alanından malzeme girişi yapın.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktif Zimmetler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {balances.map((balance) => (
              <div key={balance.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{balance.holder_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {balance.material?.material_name}
                    </p>
                  </div>
                  <Badge>
                    {balance.material
                      ? formatInventoryQuantity(
                          balance.quantity,
                          balance.material.unit
                        )
                      : balance.quantity}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {balance.holder_type === "personnel" ? "Personel" : "Ekip"}
                </p>
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => openTransfer(balance)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Aktar / Depoya İade
                  </Button>
                )}
              </div>
            ))}
          </div>
          {balances.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aktif zimmet bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son Zimmet Hareketleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tarih</th>
                  <th className="px-3 py-2 font-medium">Malzeme</th>
                  <th className="px-3 py-2 font-medium">Kaynak</th>
                  <th className="px-3 py-2 font-medium">Hedef</th>
                  <th className="px-3 py-2 font-medium">Miktar</th>
                  <th className="px-3 py-2 font-medium">Not</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateTime(movement.created_at)}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {movement.material?.material_name || "—"}
                    </td>
                    <td className="px-3 py-3">{movement.from_name}</td>
                    <td className="px-3 py-3">{movement.to_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {movement.material
                        ? formatInventoryQuantity(
                            movement.quantity,
                            movement.material.unit
                          )
                        : movement.quantity}
                    </td>
                    <td className="px-3 py-3">{movement.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(source)} onOpenChange={(open) => !open && setSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {source?.type === "warehouse"
                ? "Şantiye Deposundan Zimmetle"
                : "Zimmeti Aktar"}
            </DialogTitle>
          </DialogHeader>
          {source && (
            <div className="space-y-4">
              {source.type === "warehouse" ? (
                <Field label="Malzeme">
                  <Select value={materialId} onValueChange={setMaterialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Malzeme seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials
                        .filter((item) => Number(item.stock_quantity) > 0)
                        .map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.material_name} ·{" "}
                            {formatInventoryQuantity(
                              material.stock_quantity,
                              material.unit
                            )}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-semibold">{source.balance.holder_name}</p>
                  <p className="text-muted-foreground">
                    {source.balance.material?.material_name} ·{" "}
                    {source.balance.material
                      ? formatInventoryQuantity(
                          source.balance.quantity,
                          source.balance.material.unit
                        )
                      : source.balance.quantity}
                  </p>
                </div>
              )}

              <Field label="Hedef">
                <Select
                  value={targetType}
                  onValueChange={(value: CustodyLocationType) => {
                    setTargetType(value);
                    setTargetId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Şantiye Deposu</SelectItem>
                    <SelectItem value="personnel">Personel</SelectItem>
                    <SelectItem value="team">Ekip</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {targetType === "personnel" && (
                <Field label="Personel">
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePersonnel
                        .filter(
                          (person) =>
                            source.type !== "personnel" ||
                            person.id !== source.balance.holder_id
                        )
                        .map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {targetType === "team" && (
                <Field label="Ekip">
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ekip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams
                        .filter(
                          (team) =>
                            source.type !== "team" ||
                            team.id !== source.balance.holder_id
                        )
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field label={`Miktar${maxQuantity ? ` (En fazla ${maxQuantity})` : ""}`}>
                <Input
                  type="number"
                  min="0"
                  max={maxQuantity || undefined}
                  step={selectedMaterial?.unit === "piece" ? "1" : "0.001"}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Field label="Not (Zorunlu Değil)">
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
              <Button
                className="w-full"
                onClick={submitTransfer}
                disabled={loading || !materialId}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                İşlemi Kaydet
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
