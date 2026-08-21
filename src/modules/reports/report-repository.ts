import type { SupabaseClient } from "@supabase/supabase-js";
import { AttendanceRepository } from "@/modules/attendance/attendance-repository";
import { InventoryRepository } from "@/modules/inventory/inventory-repository";
import { ProjectRepository } from "@/modules/projects/project-repository";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { VehicleRepository } from "@/modules/vehicles/vehicle-repository";
import { WorkPlanRepository } from "@/modules/work-plans/work-plan-repository";
import { getStatusLabel } from "@/lib/constants/project";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  formatInventoryQuantity,
  getInventoryUnitLabel,
} from "@/lib/constants/inventory";
import { downloadAttendanceSummaryExcel } from "@/lib/attendance-excel";
import { downloadSimpleExcel } from "@/lib/reports-excel";

export type ReportKey =
  | "project_status"
  | "attendance"
  | "team_performance"
  | "vehicle"
  | "stock"
  | "assignment";

function holderLabel(type: string) {
  if (type === "vehicle") return "Araç";
  if (type === "personnel") return "Personel";
  if (type === "team") return "Ekip";
  return "Depo";
}

export class ReportRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async export(key: ReportKey, startDate: string, endDate: string) {
    switch (key) {
      case "project_status":
        return this.exportProjects();
      case "attendance":
        return this.exportAttendance(startDate);
      case "team_performance":
        return this.exportTeams(startDate, endDate);
      case "vehicle":
        return this.exportVehicles();
      case "stock":
        return this.exportStock(startDate, endDate);
      case "assignment":
        return this.exportCustody(startDate, endDate);
    }
  }

  private async exportProjects() {
    const [projects, typeOptions] = await Promise.all([
      new ProjectRepository(this.supabase).list({
        archiveScope: "all",
        pageSize: 2000,
        sortBy: "name",
        sortOrder: "asc",
      }),
      new SettingsRepository(this.supabase).getAllProjectTypeOptions(),
    ]);
    const labels = Object.fromEntries(typeOptions.map((item) => [item.key, item.label]));
    await downloadSimpleExcel({
      title: "Proje Durum Raporu",
      startDate: "guncel",
      endDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date()),
      columns: [
        { header: "Proje ID", key: "code", width: 16 },
        { header: "Proje Adı", key: "name", width: 36 },
        { header: "Tür", key: "type", width: 22 },
        { header: "Mevki", key: "location", width: 24 },
        { header: "Durum", key: "status", width: 22 },
        { header: "İlerleme %", key: "progress", width: 14 },
        { header: "Ekip Şefi", key: "leader", width: 22 },
        { header: "Arşiv", key: "archived", width: 10 },
      ],
      rows: projects.data.map((project) => ({
        code: project.project_code,
        name: project.name,
        type: labels[project.project_type] ?? project.project_type,
        location: project.location,
        status: getStatusLabel(project.status),
        progress: project.progress_percent ?? 0,
        leader: project.current_team_leader_name || "—",
        archived: project.is_archived ? "Evet" : "Hayır",
      })),
    });
  }

  private async exportAttendance(startDate: string) {
    const [year, month] = startDate.split("-").map(Number);
    const attendance = new AttendanceRepository(this.supabase);
    await attendance.ensureSundays(year, month);
    const monthData = await attendance.getMonth({
      year,
      month,
      activeFilter: "all",
    });
    await downloadAttendanceSummaryExcel({
      personnel: (monthData.personnel ?? []).map((person) => ({
        fullName: person.full_name,
        tcIdentityNumber: person.tc_identity_number,
        records: person.records,
      })),
      year,
      month,
      fileName: `personel-puantaj-${year}-${String(month).padStart(2, "0")}.xlsx`,
    });
  }

  private async exportTeams(startDate: string, endDate: string) {
    const plans = await new WorkPlanRepository(this.supabase).listWithTeamsInRange(
      startDate,
      endDate
    );
    await downloadSimpleExcel({
      title: "Ekip Performansı",
      startDate,
      endDate,
      columns: [
        { header: "Tarih", key: "date", width: 14 },
        { header: "Ekip Türü", key: "type", width: 18 },
        { header: "Proje ID", key: "code", width: 16 },
        { header: "Proje Adı", key: "name", width: 32 },
        { header: "Ekip Şefi", key: "chief", width: 22 },
        { header: "Plaka", key: "plate", width: 14 },
        { header: "Personel Sayısı", key: "count", width: 16 },
        { header: "Personel", key: "members", width: 40 },
      ],
      rows: plans.flatMap((plan) =>
        plan.teams.map((team) => ({
          date: formatDate(plan.plan_date),
          type: team.team_type,
          code: team.project_code,
          name: team.project_name,
          chief: team.chief_name,
          plate: team.vehicle_plate,
          count: team.members.length,
          members: team.members.map((member) => member.full_name).join(", "),
        }))
      ),
    });
  }

  private async exportVehicles() {
    const vehicles = await new VehicleRepository(this.supabase).list();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
      new Date()
    );
    await downloadSimpleExcel({
      title: "Araç Raporu",
      startDate: "guncel",
      endDate: today,
      columns: [
        { header: "Plaka", key: "plate", width: 14 },
        { header: "Marka", key: "brand", width: 16 },
        { header: "Model", key: "model", width: 16 },
        { header: "KM", key: "km", width: 12 },
        { header: "Muayene", key: "inspection", width: 14 },
        { header: "Sigorta", key: "insurance", width: 14 },
        { header: "Not", key: "notes", width: 28 },
      ],
      rows: vehicles.map((vehicle) => ({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        km: vehicle.current_km,
        inspection: formatDate(vehicle.inspection_date),
        insurance: formatDate(vehicle.insurance_date),
        notes: vehicle.notes || "—",
      })),
    });
  }

  private async exportStock(startDate: string, endDate: string) {
    const inventory = new InventoryRepository(this.supabase);
    const [materials, movements] = await Promise.all([
      inventory.listMaterials("stock"),
      inventory.listMovementsInRange(startDate, endDate),
    ]);
    await downloadSimpleExcel({
      title: "Stok Raporu",
      startDate,
      endDate,
      columns: [
        { header: "Kod", key: "code", width: 14 },
        { header: "Malzeme", key: "name", width: 32 },
        { header: "Birim", key: "unit", width: 10 },
        { header: "Mevcut Stok", key: "stock", width: 14 },
        { header: "Dönem Giriş", key: "incoming", width: 14 },
        { header: "Dönem Çıkış", key: "outgoing", width: 14 },
      ],
      rows: materials.map((material) => {
        const related = movements.filter((item) => item.material_id === material.id);
        const incoming = related
          .filter((item) => item.movement_type === "in")
          .reduce((sum, item) => sum + Number(item.quantity), 0);
        const outgoing = related
          .filter((item) => item.movement_type === "out")
          .reduce((sum, item) => sum + Number(item.quantity), 0);
        return {
          code: material.material_code || "—",
          name: material.material_name,
          unit: getInventoryUnitLabel(material.unit),
          stock: formatInventoryQuantity(material.stock_quantity, material.unit),
          incoming,
          outgoing,
        };
      }),
    });
  }

  private async exportCustody(startDate: string, endDate: string) {
    const inventory = new InventoryRepository(this.supabase);
    const [balances, movements] = await Promise.all([
      inventory.listCustodyBalances(),
      inventory.listCustodyMovementsInRange(startDate, endDate),
    ]);
    await downloadSimpleExcel({
      title: "Zimmet Raporu",
      startDate,
      endDate,
      columns: [
        { header: "Malzeme", key: "material", width: 28 },
        { header: "Konum Tipi", key: "type", width: 14 },
        { header: "Konum", key: "holder", width: 28 },
        { header: "Miktar", key: "quantity", width: 12 },
        { header: "Son Güncelleme", key: "updated", width: 20 },
        { header: "Dönem Hareket", key: "moves", width: 16 },
      ],
      rows: balances.map((balance) => ({
        material: balance.material?.material_name || "—",
        type: holderLabel(balance.holder_type),
        holder: balance.holder_name,
        quantity: Number(balance.quantity),
        updated: formatDateTime(balance.updated_at),
        moves: movements.filter((item) => item.material_id === balance.material_id).length,
      })),
    });
  }
}
