"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ProjectRepository } from "@/modules/projects/project-repository";
import {
  booleanToTriState,
  projectCreateSchema,
  projectEditSchema,
  triStateToBoolean,
  type ProjectCreateValues,
  type ProjectEditValues,
} from "@/lib/validations/project";
import type { Project } from "@/types/project";
import {
  CABLE_OPTIONS,
  JOINT_OPTIONS,
  OBK_OPTIONS,
  getStageDateKey,
  getStatusLabel,
  isBfOrGfProject,
  todayISODate,
} from "@/lib/constants/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  mode: "create" | "edit";
  project?: Project;
  typeOptions: { key: string; label: string }[];
};

function readStageDate(project: Project): string {
  const key = getStageDateKey(project.status);
  return project[key] ?? todayISODate();
}

export function ProjectForm({ mode, project, typeOptions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  if (mode === "create") {
    return (
      <CreateProjectForm
        typeOptions={typeOptions}
        loading={loading}
        setLoading={setLoading}
        locationSuggestions={locationSuggestions}
        setLocationSuggestions={setLocationSuggestions}
        showLocationSuggestions={showLocationSuggestions}
        setShowLocationSuggestions={setShowLocationSuggestions}
        router={router}
      />
    );
  }

  return (
    <EditProjectForm
      project={project!}
      typeOptions={typeOptions}
      loading={loading}
      setLoading={setLoading}
      locationSuggestions={locationSuggestions}
      setLocationSuggestions={setLocationSuggestions}
      showLocationSuggestions={showLocationSuggestions}
      setShowLocationSuggestions={setShowLocationSuggestions}
      router={router}
    />
  );
}

type SharedProps = {
  typeOptions: { key: string; label: string }[];
  loading: boolean;
  setLoading: (v: boolean) => void;
  locationSuggestions: string[];
  setLocationSuggestions: (v: string[]) => void;
  showLocationSuggestions: boolean;
  setShowLocationSuggestions: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
};

function CreateProjectForm({
  typeOptions,
  loading,
  setLoading,
  locationSuggestions,
  setLocationSuggestions,
  showLocationSuggestions,
  setShowLocationSuggestions,
  router,
}: SharedProps) {
  const form = useForm<ProjectCreateValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      project_code: "",
      name: "",
      project_type: typeOptions[0]?.key ?? "GF",
      location: "",
      description: "",
      received_at: todayISODate(),
      tracks_obk: false,
      sheet_count: 1,
      hp_count: 0,
      is_single_sheet: false,
    },
  });

  const locationValue = form.watch("location");
  const projectType = form.watch("project_type");
  const isBfOrGf = isBfOrGfProject(projectType);

  useLocationSuggestions(locationValue, setLocationSuggestions);

  const filteredLocations = useMemo(
    () =>
      locationSuggestions.filter(
        (v) =>
          !locationValue ||
          v.toLowerCase().includes(locationValue.toLowerCase())
      ),
    [locationSuggestions, locationValue]
  );

  async function onSubmit(values: ProjectCreateValues) {
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

    try {
      const created = await new ProjectRepository(supabase).create({
        project_code: values.project_code,
        name: values.name,
        project_type: values.project_type,
        location: values.location,
        description: values.description || null,
        received_at: values.received_at || todayISODate(),
        tracks_obk:
          isBfOrGfProject(values.project_type) && values.tracks_obk,
        sheet_count: isBfOrGfProject(values.project_type) ? values.sheet_count : null,
        hp_count: isBfOrGfProject(values.project_type) ? values.hp_count : null,
        is_single_sheet: values.is_single_sheet,
        created_by: user.id,
        updated_by: user.id,
      });
      toast.success("Proje oluşturuldu", {
        description: `${created.project_code} · Başlamadı`,
      });
      router.push(`/projects/${created.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      const message =
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
          ? "Bu Proje ID zaten kayıtlı"
          : "Proje oluşturulamadı";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Proje</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Yeni projeler <strong>Başlamadı</strong> durumunda kaydedilir. Girişte
            yalnız <strong>Alınan Tarih</strong> işlenir. Bitiş tarihi arşive
            aktarımda kaydedilir.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_code">Proje ID</Label>
              <Input
                id="project_code"
                placeholder="Firma proje numarası"
                {...form.register("project_code")}
              />
              {form.formState.errors.project_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.project_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="received_at">Alınan Tarih</Label>
              <Input
                id="received_at"
                type="date"
                {...form.register("received_at")}
              />
              {form.formState.errors.received_at && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.received_at.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Proje Adı</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Proje Türü</Label>
              <Select
                value={form.watch("project_type")}
                onValueChange={(v) => form.setValue("project_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <LocationField
              form={form}
              show={showLocationSuggestions}
              setShow={setShowLocationSuggestions}
              suggestions={filteredLocations}
            />

            {isBfOrGf && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-4 md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={form.watch("tracks_obk")}
                  onChange={(event) =>
                    form.setValue("tracks_obk", event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">OBK takibi var</span>
                  <span className="block text-xs text-muted-foreground">
                    İşaretlenirse bu projede OBK çekildi/çekilmedi bilgisi takip edilir.
                    İşaretlenmezse OBK alanı hiç gösterilmez.
                  </span>
                </span>
              </label>
            )}

            {isBfOrGf && <><div className="space-y-2"><Label htmlFor="sheet_count">Pafta Sayısı</Label><Input id="sheet_count" type="number" min="1" {...form.register("sheet_count")}/></div><div className="space-y-2"><Label htmlFor="hp_count">HP Bilgisi</Label><Input id="hp_count" type="number" min="0" {...form.register("hp_count")}/></div></>}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-4 md:col-span-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={form.watch("is_single_sheet")} onChange={e=>form.setValue("is_single_sheet",e.target.checked)}/><span><span className="block text-sm font-medium">Proje tek paftadan oluşuyor</span><span className="block text-xs text-muted-foreground">Tek pafta otomatik oluşturulur ve alanları proje kartında gösterilir.</span></span></label>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
          </div>

          <FormActions loading={loading} submitLabel="Proje Oluştur" router={router} />
        </form>
      </CardContent>
    </Card>
  );
}

function EditProjectForm({
  project,
  typeOptions,
  loading,
  setLoading,
  locationSuggestions,
  setLocationSuggestions,
  showLocationSuggestions,
  setShowLocationSuggestions,
  router,
}: SharedProps & { project: Project }) {
  const form = useForm<ProjectEditValues>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      project_code: project.project_code,
      name: project.name,
      project_type: project.project_type,
      location: project.location,
      description: project.description ?? "",
      received_at: project.received_at ?? todayISODate(),
      status: project.status,
      stage_date: readStageDate(project),
      cable_pulled: booleanToTriState(project.cable_pulled),
      tracks_obk: project.tracks_obk ?? false,
      obk_pulled: booleanToTriState(project.obk_pulled),
      joint_done: booleanToTriState(project.joint_done),
      progress_notes: project.progress_notes ?? "",
    },
  });

  const locationValue = form.watch("location");
  const status = form.watch("status");
  const projectType = form.watch("project_type");
  const isBfOrGf = isBfOrGfProject(projectType);
  const tracksObk = form.watch("tracks_obk");

  useLocationSuggestions(locationValue, setLocationSuggestions);

  const filteredLocations = useMemo(
    () =>
      locationSuggestions.filter(
        (v) =>
          !locationValue ||
          v.toLowerCase().includes(locationValue.toLowerCase())
      ),
    [locationSuggestions, locationValue]
  );

  async function onSubmit(values: ProjectEditValues) {
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

    try {
      await new ProjectRepository(supabase).update(project.id, {
        project_code: values.project_code,
        name: values.name,
        project_type: values.project_type,
        location: values.location,
        description: values.description || null,
        received_at: values.received_at,
        tracks_cable: true,
        cable_pulled: triStateToBoolean(values.cable_pulled),
        tracks_obk: isBfOrGf && values.tracks_obk,
        obk_pulled: isBfOrGf && values.tracks_obk
          ? triStateToBoolean(values.obk_pulled)
          : null,
        tracks_joint: true,
        joint_done: triStateToBoolean(values.joint_done),
        progress_notes: values.progress_notes || null,
        updated_by: user.id,
      });
      toast.success("Proje güncellendi");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      const message =
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
          ? "Bu Proje ID zaten kayıtlı"
          : "Proje güncellenemedi";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeyi Düzenle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_code">Proje ID</Label>
              <Input
                id="project_code"
                placeholder="Firma proje numarası"
                {...form.register("project_code")}
              />
              {form.formState.errors.project_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.project_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Proje Adı</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Proje Türü</Label>
              <Select
                value={form.watch("project_type")}
                onValueChange={(v) => form.setValue("project_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Input value={getStatusLabel(status)} disabled />
              <p className="text-xs text-muted-foreground">
                Durum, proje aşamalarına göre sistem tarafından otomatik belirlenir.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="received_at">Alınan Tarih</Label>
              <Input
                id="received_at"
                type="date"
                {...form.register("received_at")}
              />
              {form.formState.errors.received_at && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.received_at.message}
                </p>
              )}
            </div>

            <LocationField
              form={form}
              show={showLocationSuggestions}
              setShow={setShowLocationSuggestions}
              suggestions={filteredLocations}
            />

            {isBfOrGf && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-4 md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={tracksObk}
                  onChange={(event) =>
                    form.setValue("tracks_obk", event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">OBK takibi var</span>
                  <span className="block text-xs text-muted-foreground">
                    İşaret kaldırılırsa bu projede OBK bilgisi gösterilmez.
                  </span>
                </span>
              </label>
            )}

            {(
              <div className="md:col-span-2 space-y-4 rounded-2xl border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {isBfOrGf ? `${projectType} Proje Takibi` : "Devam Eden İş Adımları"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isBfOrGf
                      ? tracksObk
                        ? "OBK ve ek durumunu işaretleyin; gerekirse açıklama ekleyin."
                        : "Ek durumunu işaretleyin; gerekirse açıklama ekleyin."
                      : "Kablo ve ek durumunu işaretleyin; gerekirse açıklama ekleyin."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(!isBfOrGf || tracksObk) && (
                  <div className="space-y-2">
                    <Label>{isBfOrGf ? "OBK" : "Kablo"}</Label>
                    <Select
                      value={
                        isBfOrGf
                          ? form.watch("obk_pulled")
                          : form.watch("cable_pulled")
                      }
                      onValueChange={(v) =>
                        form.setValue(
                          isBfOrGf ? "obk_pulled" : "cable_pulled",
                          v as ProjectEditValues["obk_pulled"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {(isBfOrGf ? OBK_OPTIONS : CABLE_OPTIONS).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(isBfOrGf
                      ? form.formState.errors.obk_pulled
                      : form.formState.errors.cable_pulled) && (
                      <p className="text-xs text-destructive">
                        {isBfOrGf
                          ? form.formState.errors.obk_pulled?.message
                          : form.formState.errors.cable_pulled?.message}
                      </p>
                    )}
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label>Ek</Label>
                    <Select
                      value={form.watch("joint_done")}
                      onValueChange={(v) =>
                        form.setValue(
                          "joint_done",
                          v as ProjectEditValues["joint_done"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOINT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.joint_done && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.joint_done.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="progress_notes">İş Adımı Açıklaması</Label>
                    <Textarea
                      id="progress_notes"
                      placeholder={
                        isBfOrGf
                          ? "OBK / ek ile ilgili notlar..."
                          : "Kablo / ek ile ilgili notlar..."
                      }
                      {...form.register("progress_notes")}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Genel Açıklama</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>
          </div>

          <FormActions loading={loading} submitLabel="Kaydet" router={router} />
        </form>
      </CardContent>
    </Card>
  );
}

function useLocationSuggestions(
  locationValue: string,
  setLocationSuggestions: (v: string[]) => void
) {
  useEffect(() => {
    const supabase = createClient();
    const repo = new ProjectRepository(supabase);
    const timer = setTimeout(async () => {
      try {
        const values = await repo.getLocationSuggestions(locationValue || "", 12);
        setLocationSuggestions(values);
      } catch {
        /* sessiz */
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [locationValue, setLocationSuggestions]);
}

function LocationField({
  form,
  show,
  setShow,
  suggestions,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  show: boolean;
  setShow: (v: boolean) => void;
  suggestions: string[];
}) {
  return (
    <div className="relative space-y-2">
      <Label htmlFor="location">Mevki</Label>
      <Input
        id="location"
        autoComplete="off"
        {...form.register("location")}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
      />
      {show && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-md">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={() => {
                form.setValue("location", item);
                setShow(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {form.formState.errors.location && (
        <p className="text-xs text-destructive">
          {form.formState.errors.location.message}
        </p>
      )}
    </div>
  );
}

function FormActions({
  loading,
  submitLabel,
  router,
}: {
  loading: boolean;
  submitLabel: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
      <Button type="button" variant="outline" onClick={() => router.back()}>
        İptal
      </Button>
    </div>
  );
}
