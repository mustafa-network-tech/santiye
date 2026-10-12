"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ClipboardList, FileDown, Loader2, MessageCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Personnel } from "@/types/work-plan";
import type { ProductionEntry, ProductionItem, ProductionSaveJob } from "@/types/production";
import type { ProjectOption } from "@/types/project";
import type { InventoryLocation, InventoryMaterial } from "@/types/inventory";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { ProductionRepository } from "@/modules/productions/production-repository";
import { WorkPlanRepository } from "@/modules/work-plans/work-plan-repository";
import { formatInventoryQuantity, getInventoryUnitLabel } from "@/lib/constants/inventory";
import { downloadProductionHistoryPdf, saveAndShareDailyProduction } from "@/lib/production-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormLine = { key: string; description: string; materialId: string; materialQuantity: string; sourceLocation: InventoryLocation };
type FormJob = { key: string; projectId: string | null; source: "work_plan" | "manual"; title: string; workId: string; lines: FormLine[] };
type FormTeam = { key: string; entryId: string | null; personnelId: string; sourceWorkPlanId: string | null; jobs: FormJob[] };

const accents = [
  { border: "border-l-blue-600", jobBorder: "border-blue-600", soft: "bg-blue-50/60 dark:bg-blue-950/20", label: "text-blue-700 dark:text-blue-300" },
  { border: "border-l-emerald-600", jobBorder: "border-emerald-600", soft: "bg-emerald-50/60 dark:bg-emerald-950/20", label: "text-emerald-700 dark:text-emerald-300" },
  { border: "border-l-amber-600", jobBorder: "border-amber-600", soft: "bg-amber-50/60 dark:bg-amber-950/20", label: "text-amber-700 dark:text-amber-300" },
  { border: "border-l-rose-600", jobBorder: "border-rose-600", soft: "bg-rose-50/60 dark:bg-rose-950/20", label: "text-rose-700 dark:text-rose-300" },
  { border: "border-l-cyan-600", jobBorder: "border-cyan-600", soft: "bg-cyan-50/60 dark:bg-cyan-950/20", label: "text-cyan-700 dark:text-cyan-300" },
];

const makeKey = () => crypto.randomUUID();
const newLine = (): FormLine => ({ key: makeKey(), description: "", materialId: "", materialQuantity: "1", sourceLocation: "center" });
const newJob = (): FormJob => ({ key: makeKey(), projectId: null, source: "manual", title: "", workId: "", lines: [newLine()] });
const newTeam = (): FormTeam => ({ key: makeKey(), entryId: null, personnelId: "", sourceWorkPlanId: null, jobs: [newJob()] });

function entriesToTeams(entries: ProductionEntry[]): FormTeam[] {
  return entries.map((entry) => ({
    key: entry.id,
    entryId: entry.id,
    personnelId: entry.team_leader_personnel_id,
    sourceWorkPlanId: entry.source_work_plan_id,
    jobs: entry.jobs.map((job) => ({
      key: job.id,
      projectId: job.project_id,
      source: entry.source_work_plan_id ? job.source : "manual",
      title: job.project_name_snapshot,
      workId: job.project_code_snapshot || (job.source === "manual" ? "" : job.project_name_snapshot),
      lines: job.items.map((item) => ({
        key: item.id,
        description: item.item_name_snapshot,
        materialId: item.inventory_material_id ?? "",
        materialQuantity: item.inventory_quantity == null ? "1" : String(item.inventory_quantity),
        sourceLocation: item.inventory_source_location ?? "center",
      })),
    })),
  })).map((team) => ({ ...team, jobs: team.jobs.length ? team.jobs : [newJob()] }));
}

function legacyDescription(name: string, quantity: number, unit: string) {
  if (unit === "SATIR" && Number(quantity) === 1) return name;
  return `${name} — ${Number(quantity).toLocaleString("tr-TR")} ${unit}`;
}

function productionItemDescription(item: ProductionItem) {
  const description = legacyDescription(item.item_name_snapshot, item.quantity, item.unit_snapshot);
  if (!item.inventory_material_name_snapshot || item.inventory_quantity == null || !item.inventory_unit_snapshot) return description;
  const location = item.inventory_source_location === "biga" ? "Biga Şube" : "Merkez Şantiye";
  return `${description} · Malzeme: ${item.inventory_material_name_snapshot}${item.inventory_material_code_snapshot ? ` (${item.inventory_material_code_snapshot})` : ""} · ${formatInventoryQuantity(item.inventory_quantity, item.inventory_unit_snapshot)} · ${location}`;
}

export function ProductionsManager({ initialDate, personnel, projectOptions, inventoryMaterials, initialEntries, readOnly }: {
  initialDate: string;
  personnel: Personnel[];
  projectOptions: ProjectOption[];
  inventoryMaterials: InventoryMaterial[];
  initialEntries: ProductionEntry[];
  readOnly: boolean;
}) {
  const initialDailyEntries = initialEntries.filter((entry) => entry.work_date === initialDate);
  const [date, setDate] = useState(initialDate);
  const [dailyEntries, setDailyEntries] = useState(initialDailyEntries);
  const [teams, setTeams] = useState<FormTeam[]>(() => entriesToTeams(initialDailyEntries).length ? entriesToTeams(initialDailyEntries) : [newTeam()]);
  const [removedEntryIds, setRemovedEntryIds] = useState<string[]>([]);
  const [reportEntries, setReportEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const month = initialDate.slice(0, 7);
  const [from, setFrom] = useState(`${month}-01`);
  const [to, setTo] = useState(`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`);
  const [personnelFilter, setPersonnelFilter] = useState("all");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [appliedRange, setAppliedRange] = useState({ from: `${month}-01`, to: `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}` });

  const activePersonnel = useMemo(() => personnel.filter((person) => person.is_active).sort((a, b) => a.full_name.localeCompare(b.full_name, "tr")), [personnel]);
  const personnelById = useMemo(() => new Map(personnel.map((person) => [person.id, person])), [personnel]);
  const filteredReport = useMemo(
    () => reportEntries.filter((entry) => personnelFilter === "all" || entry.team_leader_personnel_id === personnelFilter),
    [reportEntries, personnelFilter],
  );
  const selectedHistoryEntries = selectedHistoryDate
    ? filteredReport.filter((entry) => entry.work_date === selectedHistoryDate)
    : [];
  const reportPersonnel = [...new Map([
    ...personnel.map((person) => [person.id, person.full_name] as const),
    ...reportEntries.map((entry) => [entry.team_leader_personnel_id, entry.team_leader_name_snapshot] as const),
  ]).entries()].sort((a, b) => a[1].localeCompare(b[1], "tr"));
  const groupedReport = useMemo(() => {
    const groups = new Map<string, ProductionEntry[]>();
    for (const entry of filteredReport) groups.set(entry.work_date, [...(groups.get(entry.work_date) ?? []), entry]);
    return [...groups.entries()].sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [filteredReport]);

  async function changeDate(nextDate: string) {
    setDate(nextDate);
    setLoading(true);
    try {
      const entries = await new ProductionRepository(createClient()).listEntries(nextDate, nextDate);
      setDailyEntries(entries);
      const loadedTeams = entriesToTeams(entries);
      setTeams(loadedTeams.length ? loadedTeams : [newTeam()]);
      setRemovedEntryIds([]);
    } catch (error) {
      console.error(error);
      toast.error("Günlük imalatlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  function updateTeam(teamIndex: number, patch: Partial<FormTeam>) {
    setTeams((current) => current.map((team, index) => index === teamIndex ? { ...team, ...patch } : team));
  }

  function updateJob(teamIndex: number, jobIndex: number, patch: Partial<FormJob>) {
    setTeams((current) => current.map((team, index) => index === teamIndex
      ? { ...team, jobs: team.jobs.map((job, currentJobIndex) => currentJobIndex === jobIndex ? { ...job, ...patch } : job) }
      : team));
  }

  function setJobProjectCode(teamIndex: number, jobIndex: number, projectCode: string) {
    const normalized = projectCode.trim().toLocaleUpperCase("tr-TR");
    const project = projectOptions.find(
      (option) => option.project_code.trim().toLocaleUpperCase("tr-TR") === normalized
    );
    const current = teams[teamIndex]?.jobs[jobIndex];
    updateJob(teamIndex, jobIndex, project
      ? { projectId: project.id, workId: project.project_code, title: project.name }
      : {
          projectId: null,
          source: "manual",
          workId: projectCode,
          title: current?.projectId ? "" : current?.title ?? "",
        });
  }

  async function loadFromWorkPlan() {
    const hasContent = teams.some((team) =>
      team.entryId || team.personnelId || team.jobs.some((job) =>
        job.workId.trim() || job.title.trim() || job.lines.some((line) => line.description.trim())
      )
    );
    if (hasContent && !window.confirm("Ekrandaki imalat formu seçilen tarihin iş planıyla değiştirilsin mi?")) return;

    setLoading(true);
    try {
      const plan = await new WorkPlanRepository(createClient()).getByDate(date);
      if (!plan) return void toast.info("Seçilen tarih için iş planı bulunamadı");
      const imported = plan.teams
        .filter((team) => team.chief_personnel_id)
        .map((team): FormTeam => {
          const matchedProject = team.project_id
            ? projectOptions.find((project) => project.id === team.project_id)
            : projectOptions.find((project) =>
                project.project_code.trim().toLocaleUpperCase("tr-TR") === team.project_code.trim().toLocaleUpperCase("tr-TR")
              );
          return {
            key: makeKey(),
            entryId: null,
            personnelId: team.chief_personnel_id!,
            sourceWorkPlanId: plan.id,
            jobs: [{
              key: makeKey(),
              projectId: matchedProject?.id ?? null,
              source: "work_plan",
              title: matchedProject?.name ?? team.project_name,
              workId: matchedProject?.project_code ?? (team.project_code === "-" ? "" : team.project_code),
              lines: [newLine()],
            }],
          };
        });
      if (!imported.length) return void toast.info("İş planında ekip şefi atanmış bir ekip bulunamadı");
      setTeams(imported);
      setRemovedEntryIds(dailyEntries.map((entry) => entry.id));
      toast.success(`${imported.length} ekip iş planından getirildi`);
    } catch (error) {
      console.error(error);
      toast.error("İş planı getirilemedi", { description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function updateLine(teamIndex: number, jobIndex: number, lineIndex: number, description: string) {
    setTeams((current) => current.map((team, index) => index === teamIndex ? {
      ...team,
      jobs: team.jobs.map((job, currentJobIndex) => currentJobIndex === jobIndex ? {
        ...job,
        lines: job.lines.map((line, currentLineIndex) => currentLineIndex === lineIndex ? { ...line, description } : line),
      } : job),
    } : team));
  }

  function updateLineDetails(teamIndex: number, jobIndex: number, lineIndex: number, patch: Partial<FormLine>) {
    setTeams((current) => current.map((team, index) => index === teamIndex ? {
      ...team,
      jobs: team.jobs.map((job, currentJobIndex) => currentJobIndex === jobIndex ? {
        ...job,
        lines: job.lines.map((line, currentLineIndex) => currentLineIndex === lineIndex ? { ...line, ...patch } : line),
      } : job),
    } : team));
  }

  function removeTeam(teamIndex: number) {
    const team = teams[teamIndex];
    if (team.entryId) setRemovedEntryIds((current) => [...current, team.entryId!]);
    setTeams((current) => current.filter((_, index) => index !== teamIndex));
  }

  async function saveAll(finalize = false) {
    const completedTeams = teams.filter((team) => team.personnelId || team.jobs.some((job) => job.title.trim() || job.workId.trim() || job.lines.some((line) => line.description.trim())));
    if (!completedTeams.length) return void toast.error("En az bir ekip ekleyin");
    if (completedTeams.some((team) => !team.personnelId)) return void toast.error("Her ekip için personel seçin");
    if (new Set(completedTeams.map((team) => team.personnelId)).size !== completedTeams.length) return void toast.error("Aynı personel bir günde yalnızca bir ekipte seçilebilir");
    if (completedTeams.some((team) => team.jobs.some((job) => !job.lines.length || job.lines.some((line) => line.description.trim().length < 2)))) return void toast.error("Her iş bloğunda en az bir imalat açıklaması bulunmalı");
    for (const team of completedTeams) for (const job of team.jobs) for (const line of job.lines) {
      if (!line.materialId) continue;
      if (!job.projectId) return void toast.error("Stok malzemesi kullanılan imalat kayıtlı bir Proje ID'sine bağlanmalıdır");
      const material = inventoryMaterials.find((item) => item.id === line.materialId);
      const quantity = Number(line.materialQuantity);
      if (!material) return void toast.error("Seçilen stok malzemesi bulunamadı");
      if (!Number.isFinite(quantity) || quantity <= 0) return void toast.error(`${material.material_name} için geçerli bir miktar girin`);
      if (material.unit === "piece" && !Number.isInteger(quantity)) return void toast.error(`${material.material_name} adet birimindedir; miktar tam sayı olmalıdır`);
    }

    setLoading(true);
    try {
      const repository = new ProductionRepository(createClient());
      for (const entryId of removedEntryIds) await repository.deleteEntry(entryId);
      for (const team of completedTeams) {
        const person = personnelById.get(team.personnelId);
        if (!person) throw new Error("Seçilen personel bulunamadı");
        const jobs: ProductionSaveJob[] = team.jobs.map((job, jobIndex) => ({
          project_id: job.projectId,
          project_name: job.title.trim() || `İş / Proje ${jobIndex + 1}`,
          project_code: job.workId.trim(),
          source: job.source,
          sort_order: jobIndex,
          items: job.lines.map((line, lineIndex) => ({
            item_name: line.description.trim(),
            quantity: 1,
            unit: "SATIR",
            sort_order: lineIndex,
            inventory_material_id: line.materialId || null,
            inventory_quantity: line.materialId ? Number(line.materialQuantity) : null,
            inventory_source_location: line.materialId ? line.sourceLocation : null,
          })),
        }));
        await repository.saveEntry({ entry_id: team.entryId, work_date: date, leader_id: person.id, leader_name: person.full_name, work_plan_id: team.sourceWorkPlanId, jobs });
      }
      const entries = await repository.listEntries(date, date);
      setDailyEntries(entries);
      setTeams(entriesToTeams(entries));
      setReportEntries((current) => [
        ...current.filter((entry) => entry.work_date !== date),
        ...entries,
      ]);
      setRemovedEntryIds([]);
      toast.success(finalize ? "Günlük imalatlar kaydedildi" : "Taslak kaydedildi; düzenlemeye devam edebilirsiniz");
      if (finalize) try {
        setPdfLoading(true);
        const shared = await saveAndShareDailyProduction(entries, date);
        toast.success(shared ? "PDF paylaşım için hazırlandı" : "PDF indirildi; WhatsApp açıldı");
      } catch (shareError) {
        if ((shareError as Error).name === "AbortError") {
          toast.info("PDF paylaşımı iptal edildi");
        } else {
          console.error(shareError);
          toast.error("Kayıt tamamlandı, dosyalar oluşturulamadı", { description: (shareError as Error).message });
        }
      } finally {
        setPdfLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("İmalatlar kaydedilemedi", { description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(nextFrom = from, nextTo = to) {
    if (!nextFrom || !nextTo) return void toast.error("Başlangıç ve bitiş tarihini seçin");
    if (nextFrom > nextTo) return void toast.error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
    setLoading(true);
    try {
      setReportEntries(await new ProductionRepository(createClient()).listEntries(nextFrom, nextTo));
      setAppliedRange({ from: nextFrom, to: nextTo });
      setSelectedHistoryDate(null);
    }
    catch { toast.error("Geçmiş kayıtlar yüklenemedi"); }
    finally { setLoading(false); }
  }

  function selectHistoryDate(selectedDate: string) {
    setSelectedHistoryDate((current) => current === selectedDate ? null : selectedDate);
  }

  async function shareCurrentDay() {
    if (!dailyEntries.length) return void toast.error("Önce günlük imalatları kaydedin");
    setPdfLoading(true);
    try {
      const shared = await saveAndShareDailyProduction(dailyEntries, date);
      toast.success(shared ? "PDF paylaşım için hazırlandı" : "PDF indirildi; WhatsApp açıldı");
    } catch (error) {
      if ((error as Error).name === "AbortError") toast.info("PDF paylaşımı iptal edildi");
      else {
        console.error(error);
        toast.error("Dosyalar oluşturulamadı", { description: (error as Error).message });
      }
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadHistoryPdf() {
    const entries = selectedHistoryDate ? selectedHistoryEntries : filteredReport;
    if (!entries.length) return void toast.error("PDF için kayıt seçin");
    setPdfLoading(true);
    try {
      const pdfFrom = selectedHistoryDate ?? appliedRange.from;
      const pdfTo = selectedHistoryDate ?? appliedRange.to;
      await downloadProductionHistoryPdf(entries, pdfFrom, pdfTo);
      toast.success("Geçmiş imalat PDF'i indirildi");
    } catch (error) {
      console.error(error);
      toast.error("PDF oluşturulamadı", { description: (error as Error).message });
    } finally {
      setPdfLoading(false);
    }
  }

  return <div className="space-y-6 production-module">
    <datalist id="production-project-options">
      {projectOptions.map((project) => <option key={project.id} value={project.project_code}>{project.name}</option>)}
    </datalist>
    <header className="grid items-center gap-4 border-b pb-5 sm:grid-cols-[140px_1fr_180px]">
      <Image src="/images/logo-azg.jpeg" alt="AZG" width={112} height={64} className="h-auto w-24 object-contain sm:w-28" priority />
      <h1 className="text-center text-xl font-bold sm:text-2xl">AZG MERKEZ GÜNLÜK İMALAT</h1>
      <div className="space-y-1 sm:text-right"><Label htmlFor="production-date">Tarih</Label><Input id="production-date" type="date" value={date} onChange={(event) => void changeDate(event.target.value)} className="sm:ml-auto sm:w-40" /></div>
    </header>

    {!readOnly && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
      <div><p className="font-medium">İş planıyla bağlantılı giriş</p><p className="text-sm text-muted-foreground">Seçilen tarihteki ekip ve projeleri getirir; imalat satırlarını yine siz girersiniz.</p></div>
      <Button type="button" variant="outline" disabled={loading} onClick={() => void loadFromWorkPlan()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}İş Planından Getir</Button>
    </div>}

    <div className="space-y-5">
      {teams.map((team, teamIndex) => { const accent = accents[teamIndex % accents.length]; return <section key={team.key} className={`overflow-hidden rounded-lg border border-l-4 ${accent.border}`}>
        <div className={`flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end sm:justify-between ${accent.soft}`}>
          <div className="w-full max-w-md space-y-2"><Label className={accent.label}>Ekip Adı</Label><Select disabled={readOnly} value={team.personnelId || undefined} onValueChange={(value) => updateTeam(teamIndex, { personnelId: value })}><SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger><SelectContent>{activePersonnel.map((person) => <SelectItem key={person.id} value={person.id} disabled={teams.some((other, index) => index !== teamIndex && other.personnelId === person.id)}>{person.full_name}</SelectItem>)}</SelectContent></Select></div>
          {!readOnly && teams.length > 1 && <Button type="button" size="icon" variant="ghost" title="Ekibi kaldır" onClick={() => removeTeam(teamIndex)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
        <div className="space-y-4 p-4">{team.jobs.map((job, jobIndex) => <div key={job.key} className={`border-2 ${accent.jobBorder} bg-background p-4`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><p className={`font-semibold ${accent.label}`}>İş / Proje {jobIndex + 1}</p><div className="flex items-end gap-2"><div className="space-y-1"><Label>ID</Label><Input list="production-project-options" disabled={readOnly} value={job.workId} onChange={(event) => setJobProjectCode(teamIndex, jobIndex, event.target.value)} placeholder="-" className="w-full sm:w-52" />{job.projectId && <p className="text-xs text-emerald-600">Projeye bağlı</p>}</div>{!readOnly && team.jobs.length > 1 && <Button type="button" size="icon" variant="ghost" title="İşi kaldır" onClick={() => updateTeam(teamIndex, { jobs: team.jobs.filter((_, index) => index !== jobIndex) })}><Trash2 className="h-4 w-4" /></Button>}</div></div>
          <div className="mx-auto mb-4 max-w-2xl space-y-1 text-center"><Label htmlFor={`job-title-${job.key}`} className={accent.label}>Başlık</Label><Input id={`job-title-${job.key}`} disabled={readOnly} readOnly={Boolean(job.projectId)} value={job.title} onChange={(event) => updateJob(teamIndex, jobIndex, { title: event.target.value })} placeholder="İş / proje başlığını yazın" className="text-center font-semibold" /></div>
          <div className="space-y-3">{job.lines.map((line, lineIndex) => {
            const selectedMaterial = inventoryMaterials.find((material) => material.id === line.materialId);
            const availableStock = selectedMaterial
              ? line.sourceLocation === "biga" ? selectedMaterial.biga_stock_quantity : selectedMaterial.stock_quantity
              : 0;
            return <div key={line.key} className="grid grid-cols-[28px_minmax(0,1fr)_40px] items-start gap-2">
              <span className="pt-2 text-right text-sm font-semibold">{lineIndex + 1}:</span>
              <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
                <Textarea disabled={readOnly} value={line.description} onChange={(event) => updateLine(teamIndex, jobIndex, lineIndex, event.target.value)} placeholder="İmalat açıklamasını yazın" rows={2} className="min-h-16 resize-y bg-background" />
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_130px]">
                  <div className="space-y-1">
                    <Label>Stok Malzemesi (Opsiyonel)</Label>
                    <Select disabled={readOnly || !job.projectId} value={line.materialId || "none"} onValueChange={(value) => updateLineDetails(teamIndex, jobIndex, lineIndex, { materialId: value === "none" ? "" : value, materialQuantity: "1" })}>
                      <SelectTrigger><SelectValue placeholder={job.projectId ? "Malzeme seçin" : "Önce kayıtlı Proje ID seçin"} /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Malzeme kullanılmadı</SelectItem>{inventoryMaterials.map((material) => <SelectItem key={material.id} value={material.id}>{material.material_name}{material.material_code ? ` · ${material.material_code}` : ""} · Merkez {formatInventoryQuantity(material.stock_quantity, material.unit)} / Biga {formatInventoryQuantity(material.biga_stock_quantity, material.unit)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Stok Konumu</Label>
                    <Select disabled={readOnly || !line.materialId} value={line.sourceLocation} onValueChange={(value: InventoryLocation) => updateLineDetails(teamIndex, jobIndex, lineIndex, { sourceLocation: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="center">Merkez Şantiye</SelectItem><SelectItem value="biga">Biga Şube</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Miktar{selectedMaterial ? ` (${getInventoryUnitLabel(selectedMaterial.unit)})` : ""}</Label>
                    <Input disabled={readOnly || !line.materialId} type="number" min="0" step={selectedMaterial?.unit === "piece" ? "1" : "0.001"} value={line.materialQuantity} onChange={(event) => updateLineDetails(teamIndex, jobIndex, lineIndex, { materialQuantity: event.target.value })} />
                    {selectedMaterial && <p className="text-xs text-muted-foreground">Mevcut: {formatInventoryQuantity(availableStock, selectedMaterial.unit)}</p>}
                  </div>
                </div>
              </div>
              {!readOnly && job.lines.length > 1 ? <Button type="button" size="icon" variant="ghost" title="Satırı kaldır" onClick={() => updateJob(teamIndex, jobIndex, { lines: job.lines.filter((_, index) => index !== lineIndex) })}><Trash2 className="h-4 w-4" /></Button> : <span />}
            </div>;
          })}</div>
          {!readOnly && <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => updateJob(teamIndex, jobIndex, { lines: [...job.lines, newLine()] })}><Plus className="h-4 w-4" />İmalat Ekle</Button>}
        </div>)}
          {!readOnly && <Button type="button" variant="outline" className="w-full" onClick={() => updateTeam(teamIndex, { jobs: [...team.jobs, newJob()] })}><Plus className="h-4 w-4" />İş / Proje Ekle</Button>}
        </div>
      </section>; })}
      {!readOnly && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button type="button" variant="outline" onClick={() => setTeams((current) => [...current, newTeam()])}><Plus className="h-4 w-4" />Ekip Ekle</Button><Button type="button" variant="outline" disabled={loading || pdfLoading} onClick={() => void saveAll(false)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Taslak Kaydet</Button><Button type="button" variant="outline" disabled={!dailyEntries.length || pdfLoading} onClick={() => void shareCurrentDay()}>{pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Tekrar Paylaş</Button><Button type="button" disabled={loading || pdfLoading} onClick={() => void saveAll(true)}>{loading || pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Kaydet ve Paylaş</Button></div>}
      {!dailyEntries.length && !loading && <p className="text-center text-sm text-muted-foreground">Bu tarih için henüz kayıt yok.</p>}
    </div>

    <Card className="screen-only"><CardHeader><CardTitle className="text-base">Geçmiş Kayıtlar ve A4 Çıktı</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Başlangıç"><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="Bitiş"><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field><Field label="Ekip"><Select value={personnelFilter} onValueChange={(value) => { setPersonnelFilter(value); setSelectedHistoryDate(null); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Ekipler</SelectItem>{reportPersonnel.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></Field></div>
      <div className="flex flex-wrap gap-2"><Button disabled={loading} onClick={() => void loadReport()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}İmalatları Listele</Button><Button variant="outline" disabled={!filteredReport.length || pdfLoading} onClick={() => void downloadHistoryPdf()}>{pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Filtrelenenleri PDF İndir</Button></div>
      <div className="border-t pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">Filtrelenen İmalatlar</p><p className="text-sm text-muted-foreground">{formatDate(appliedRange.from)} - {formatDate(appliedRange.to)} · {filteredReport.length} ekip kaydı</p></div>{selectedHistoryDate && <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedHistoryDate(null)}>Tüm tarihleri göster</Button>}</div>
        <div className="space-y-5">{groupedReport.map(([historyDate, entries]) => {
          if (selectedHistoryDate && selectedHistoryDate !== historyDate) return null;
          return <section key={historyDate} className="overflow-hidden rounded-lg border">
            <button type="button" onClick={() => selectHistoryDate(historyDate)} className="flex w-full items-center justify-between bg-muted/50 px-4 py-3 text-left hover:bg-muted"><strong>{formatDate(historyDate)}</strong><span className="text-sm text-muted-foreground">{entries.length} ekip</span></button>
            <div className="space-y-4 p-4">{entries.map((entry) => <article key={entry.id} className="border-l-4 border-l-primary border p-4"><h4 className="font-bold">Ekip: {entry.team_leader_name_snapshot}</h4><div className="mt-3 space-y-3">{entry.jobs.map((job, jobIndex) => <div key={job.id} className="border p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b pb-2"><strong>İş / Proje {jobIndex + 1}</strong><strong>ID: {job.project_code_snapshot || "-"}</strong></div><h5 className="mb-3 text-center font-bold">{job.project_name_snapshot}</h5><div className="space-y-2">{job.items.map((item, itemIndex) => <div key={item.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 text-sm"><strong>{itemIndex + 1}:</strong><span>{productionItemDescription(item)}</span></div>)}</div></div>)}</div></article>)}</div>
          </section>;
        })}</div>
        {!filteredReport.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Seçilen tarih aralığı ve ekip için imalat kaydı bulunamadı.</p>}
      </div>
    </CardContent></Card>

    <section className="production-print-root hidden bg-white text-black">
      <div className="grid grid-cols-[100px_1fr_140px] items-center border-b-2 border-black pb-3"><Image src="/images/logo-azg.jpeg" alt="AZG" width={100} height={58} className="h-auto w-24 object-contain" /><h2 className="text-center text-lg font-bold">AZG MERKEZ GÜNLÜK İMALAT</h2><p className="text-right text-sm font-semibold">Tarih: {from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`}</p></div>
      <div className="mt-5 space-y-5">{filteredReport.map((entry, entryIndex) => { const accent = accents[entryIndex % accents.length]; return <article key={entry.id} className={`production-print-team border-2 border-l-8 border-black ${accent.border}`}><div className="border-b-2 border-black bg-slate-100 px-4 py-2 font-bold">EKİP ADI: {entry.team_leader_name_snapshot}</div><div className="space-y-3 p-3">{entry.jobs.map((job, jobIndex) => <div key={job.id} className="production-print-job border border-black p-3"><div className="mb-2 flex items-center justify-between border-b border-black pb-2"><strong>İŞ / PROJE {jobIndex + 1}</strong><strong>ID: {job.project_code_snapshot || "-"}</strong></div><div className="mb-3 text-center font-bold">{job.project_name_snapshot}</div><ol className="list-decimal space-y-2 pl-6">{job.items.map((item) => <li key={item.id}>{productionItemDescription(item)}</li>)}</ol></div>)}</div></article>; })}{!filteredReport.length && <p className="py-10 text-center">Filtreye uygun kayıt yok.</p>}</div>
    </section>

    <style jsx global>{`
      @page { size: A4 portrait; margin: 14mm; }
      @media print {
        body * { visibility: hidden !important; }
        .production-print-root, .production-print-root * { visibility: visible !important; }
        .production-print-root { display: block !important; position: absolute; inset: 0; width: 100%; border: 0 !important; padding: 0 !important; font-family: Arial, sans-serif; font-size: 11pt; }
        .production-print-team { break-inside: avoid-page; page-break-inside: avoid; }
        .production-print-job { break-inside: avoid-page; page-break-inside: avoid; }
        .production-print-root h2 { font-size: 15pt; }
      }
    `}</style>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
