import { z } from "zod";
import { isOngoingProjectStatus } from "@/lib/constants/project";

const triState = z.enum(["unset", "true", "false"]);

/** Yeni proje: yalnız alınan tarih */
export const projectCreateSchema = z.object({
  project_code: z
    .string()
    .trim()
    .min(1, "Proje ID zorunlu")
    .max(80, "Proje ID en fazla 80 karakter olabilir"),
  name: z
    .string()
    .trim()
    .min(2, "Proje adı en az 2 karakter olmalı")
    .max(200, "Proje adı en fazla 200 karakter olabilir"),
  project_type: z.string().min(1, "Proje türü seçilmeli"),
  location: z
    .string()
    .trim()
    .min(2, "Mevki en az 2 karakter olmalı")
    .max(200, "Mevki en fazla 200 karakter olabilir"),
  description: z
    .string()
    .trim()
    .max(5000, "Açıklama en fazla 5000 karakter olabilir")
    .optional()
    .or(z.literal("")),
  received_at: z.string().min(1, "Alınan tarih zorunlu"),
  status: z.enum(["waiting", "in_progress", "excavation_permit_waiting", "completed"]),
  project_date: z.string().optional().or(z.literal("")),
  priority_order: z.coerce.number().int().positive().optional().or(z.literal("")),
  completed_by_personnel_id: z.string().optional().or(z.literal("")),
  completed_by_name: z.string().optional().or(z.literal("")),
  tracks_obk: z.boolean(),
  tracks_excavation: z.boolean(),
  tracks_cable: z.boolean(),
  tracks_joint: z.boolean(),
  sheet_count: z.coerce.number().int().positive().optional(),
  hp_count: z.coerce.number().int().nonnegative().optional(),
  is_single_sheet: z.boolean(),
  bgfd_t7: z.coerce.number().int().nonnegative(),
  bgfd_t9: z.coerce.number().int().nonnegative(),
  bgfd_t11: z.coerce.number().int().nonnegative(),
  bgfd_t21: z.coerce.number().int().nonnegative(),
  bgfd_t23: z.coerce.number().int().nonnegative(),
  bgfd_t7_sd: z.string(),
  bgfd_t9_sd: z.string(),
  bgfd_t11_sd: z.string(),
  bgfd_t21_sd: z.string(),
  bgfd_t23_sd: z.string(),
}).superRefine((data, ctx) => {
  if (data.project_type === "BGFD" && data.bgfd_t7 + data.bgfd_t9 + data.bgfd_t11 + data.bgfd_t21 + data.bgfd_t23 < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "BGFD için en az bir dolap girilmeli", path: ["bgfd_t7"] });
  }
  if (data.project_type === "BGFD") {
    for (const type of ["t7","t9","t11","t21","t23"] as const) {
      const count = data[`bgfd_${type}`];
      const codes = data[`bgfd_${type}_sd`].split(",").map(v => v.trim()).filter(Boolean);
      if (codes.length !== count || codes.some(code => !/^\d{3}$/.test(code))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${type.toUpperCase()} için her dolaba ait 3 haneli SD girilmeli`, path: [`bgfd_${type}_sd`] });
    }
    const allCodes = [data.bgfd_t7_sd,data.bgfd_t9_sd,data.bgfd_t11_sd,data.bgfd_t21_sd,data.bgfd_t23_sd].join(",").split(",").map(v=>v.trim()).filter(Boolean);
    if (new Set(allCodes).size !== allCodes.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SD numaraları aynı projede tekrar edemez", path: ["bgfd_t7_sd"] });
  }
  if (data.project_type === "KURUMSAL_TTVPN" && data.status === "completed" && !data.completed_by_personnel_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Projeyi bitiren ekip başı seçilmeli", path: ["completed_by_personnel_id"] });
  }
});

export type ProjectCreateValues = z.infer<typeof projectCreateSchema>;

/** Düzenleme: aşama + alınan tarih; bitiş yalnız Tamamlandı’da */
export const projectEditSchema = z
  .object({
    project_code: z
      .string()
      .trim()
      .min(1, "Proje ID zorunlu")
      .max(80, "Proje ID en fazla 80 karakter olabilir"),
    name: z
      .string()
      .trim()
      .min(2, "Proje adı en az 2 karakter olmalı")
      .max(200, "Proje adı en fazla 200 karakter olabilir"),
    project_type: z.string().min(1, "Proje türü seçilmeli"),
    location: z
      .string()
      .trim()
      .min(2, "Mevki en az 2 karakter olmalı")
      .max(200, "Mevki en fazla 200 karakter olabilir"),
    description: z
      .string()
      .trim()
      .max(5000, "Açıklama en fazla 5000 karakter olabilir")
      .optional()
      .or(z.literal("")),
    received_at: z.string().min(1, "Alınan tarih zorunlu"),
    status: z.enum([
      "waiting",
      "in_progress",
      "excavation_permit_waiting",
      "delayed",
      "completed",
    ]),
    stage_date: z.string().min(1, "Aşama tarihi zorunlu"),
    project_date: z.string().optional().or(z.literal("")),
    priority_order: z.coerce.number().int().positive().optional().or(z.literal("")),
    completed_by_personnel_id: z.string().optional().or(z.literal("")),
    completed_by_name: z.string().optional().or(z.literal("")),
    cable_pulled: triState,
    tracks_obk: z.boolean(),
    tracks_excavation: z.boolean(),
    tracks_cable: z.boolean(),
    tracks_joint: z.boolean(),
    obk_pulled: triState,
    joint_done: triState,
    progress_notes: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isBfOrGf =
      data.project_type === "BF" || data.project_type === "GF";

    if (data.project_type === "KURUMSAL_TTVPN" && data.status === "completed" && !data.completed_by_personnel_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Projeyi bitiren ekip başı seçilmeli", path: ["completed_by_personnel_id"] });
    }

    if (isOngoingProjectStatus(data.status) && !isBfOrGf && data.project_type !== "BGFD") {
      if (data.cable_pulled === "unset") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kablo durumu seçilmeli",
          path: ["cable_pulled"],
        });
      }
      if (data.joint_done === "unset") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ek durumu seçilmeli",
          path: ["joint_done"],
        });
      }
    }
  });

export type ProjectEditValues = z.infer<typeof projectEditSchema>;

/** Geriye uyumluluk */
export const projectFormSchema = projectEditSchema;
export type ProjectFormValues = ProjectEditValues;

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Yeni şifre en az 8 karakter olmalı"),
    confirmPassword: z.string().min(8, "Şifre tekrarı gerekli"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export const customTypesSchema = z.object({
  custom_1: z.string().trim().min(1, "Kategori adı zorunlu").max(80),
  custom_2: z.string().trim().min(1, "Kategori adı zorunlu").max(80),
  custom_3: z.string().trim().min(1, "Kategori adı zorunlu").max(80),
  custom_4: z.string().trim().min(1, "Kategori adı zorunlu").max(80),
});

export type CustomTypesFormValues = z.infer<typeof customTypesSchema>;

export function triStateToBoolean(
  value: "unset" | "true" | "false"
): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function booleanToTriState(
  value: boolean | null | undefined
): "unset" | "true" | "false" {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unset";
}
