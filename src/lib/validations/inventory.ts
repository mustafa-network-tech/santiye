import { z } from "zod";

const quantity = z.coerce
  .number()
  .positive("Miktar sıfırdan büyük olmalı")
  .max(999_999_999, "Miktar çok yüksek");

export const inventoryMaterialSchema = z
  .object({
    material_name: z.string().trim().min(2, "Malzeme cinsi zorunlu").max(150),
    material_code: z.string().trim().max(80).optional().or(z.literal("")),
    unit: z.enum(["piece", "meter", "kilogram"]),
    initial_quantity: quantity,
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.unit === "piece" && !Number.isInteger(data.initial_quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["initial_quantity"],
        message: "Adet miktarı tam sayı olmalı",
      });
    }
  });

export const inventoryMovementSchema = z.object({
  quantity,
  usage_location: z.string().trim().max(250).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type InventoryMaterialFormValues = z.infer<
  typeof inventoryMaterialSchema
>;
export type InventoryMovementFormValues = z.infer<
  typeof inventoryMovementSchema
>;
