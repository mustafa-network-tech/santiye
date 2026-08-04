import { z } from "zod";

export const personnelSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı")
    .max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  is_active: z.boolean(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type PersonnelFormValues = z.infer<typeof personnelSchema>;

export const workPlanMemberSchema = z.object({
  personnel_id: z.string().nullable(),
  full_name: z.string().min(2),
  phone: z.string().nullable(),
  is_chief: z.boolean(),
  sort_order: z.number().int().min(0),
});

export const workPlanTeamSchema = z
  .object({
    client_id: z.string(),
    project_code: z.string().trim().min(1, "Proje ID zorunlu").max(80),
    project_name: z.string().trim().min(2, "Proje adı zorunlu").max(200),
    team_type: z.string().trim().min(1, "Ekip türü zorunlu").max(80),
    vehicle_plate: z.string().trim().min(1, "Araç plakası zorunlu").max(40),
    chief_personnel_id: z.string().min(1, "Ekip şefi seçilmeli"),
    chief_name: z.string().trim().min(2, "Ekip şefi adı zorunlu"),
    chief_phone: z
      .string()
      .trim()
      .min(7, "Ekip şefi telefonu zorunlu")
      .max(30),
    member_ids: z.array(z.string()),
    members: z.array(workPlanMemberSchema),
  })
  .superRefine((team, ctx) => {
    if (!team.chief_personnel_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ekip şefi zorunlu",
        path: ["chief_personnel_id"],
      });
    }
    const chiefs = team.members.filter((m) => m.is_chief);
    if (chiefs.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listede tek bir ekip şefi olmalıdır",
        path: ["members"],
      });
    }
    if (team.members.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En az ekip şefi eklenmelidir",
        path: ["members"],
      });
    }
  });

export const workPlanFormSchema = z.object({
  plan_date: z.string().min(1, "Plan tarihi zorunlu"),
  notes: z.string().optional().or(z.literal("")),
  teams: z
    .array(workPlanTeamSchema)
    .min(1, "En az bir ekip eklenmelidir"),
});

export type WorkPlanFormValues = z.infer<typeof workPlanFormSchema>;
export type WorkPlanTeamFormValues = z.infer<typeof workPlanTeamSchema>;
