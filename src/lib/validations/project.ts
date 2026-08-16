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
  tracks_obk: z.boolean(),
  sheet_count: z.coerce.number().int().positive().optional(),
  hp_count: z.coerce.number().int().nonnegative().optional(),
  is_single_sheet: z.boolean(),
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
    cable_pulled: triState,
    tracks_obk: z.boolean(),
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

    if (isOngoingProjectStatus(data.status) && !isBfOrGf) {
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
