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
  PROJECT_STATUSES,
  getStageDateKey,
  getStageDateLabel,
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
    },
  });

  const locationValue = form.watch("location");

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
        created_by: user.id,
        updated_by: user.id,
      });
      toast.success("Proje oluşturuldu", {
        description: `${created.project_code} · Bekliyor`,
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
            Yeni projeler <strong>Bekliyor</strong> durumunda kaydedilir. Girişte
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
      joint_done: booleanToTriState(project.joint_done),
      progress_notes: project.progress_notes ?? "",
    },
  });

  const locationValue = form.watch("location");
  const status = form.watch("status");

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

  function handleStatusChange(next: ProjectEditValues["status"]) {
    form.setValue("status", next);
    const key = getStageDateKey(next);
    const existing = project[key];
    form.setValue("stage_date", existing ?? todayISODate());
  }

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
      await new ProjectRepository(supabase).updateWithStageDate(project.id, {
        project_code: values.project_code,
        name: values.name,
        project_type: values.project_type,
        location: values.location,
        description: values.description || null,
        received_at: values.received_at,
        status: values.status,
        stage_date: values.stage_date,
        cable_pulled:
          values.status === "in_progress"
            ? triStateToBoolean(values.cable_pulled)
            : project.cable_pulled,
        joint_done:
          values.status === "in_progress"
            ? triStateToBoolean(values.joint_done)
            : project.joint_done,
        progress_notes:
          values.status === "in_progress"
            ? values.progress_notes || null
            : project.progress_notes,
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

  const stageLabel = getStageDateLabel(status);

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
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {status === "completed" && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Tamamlanan projeler arşive alınır; bitiş tarihi bu adımda
                  işlenir.
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

            <div className="space-y-2">
              <Label htmlFor="stage_date">{stageLabel}</Label>
              <Input
                id="stage_date"
                type="date"
                {...form.register("stage_date")}
              />
              {form.formState.errors.stage_date && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.stage_date.message}
                </p>
              )}
            </div>

            <LocationField
              form={form}
              show={showLocationSuggestions}
              setShow={setShowLocationSuggestions}
              suggestions={filteredLocations}
            />

            {status === "in_progress" && (
              <div className="md:col-span-2 space-y-4 rounded-2xl border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">Devam Eden İş Adımları</p>
                  <p className="text-xs text-muted-foreground">
                    Kablo ve ek durumunu işaretleyin; gerekirse açıklama ekleyin.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Kablo</Label>
                    <Select
                      value={form.watch("cable_pulled")}
                      onValueChange={(v) =>
                        form.setValue(
                          "cable_pulled",
                          v as ProjectEditValues["cable_pulled"]
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CABLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.cable_pulled && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.cable_pulled.message}
                      </p>
                    )}
                  </div>

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
                      placeholder="Kablo / ek ile ilgili notlar..."
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
