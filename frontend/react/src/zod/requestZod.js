import { z } from "zod";

export const approveRequestSchema = z.object({
  quantity: z
    .string()
    .refine(
      (val) =>
        !isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val)),
      {
        message: "Quantity must be a positive integer",
      },
    ),
  fine_per_day: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Fine per day must be a non-negative number",
    }),
  total_price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: "Total price must be a non-negative number",
  }),
  borrow_price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: "Borrow price must be a non-negative number",
  }),
  category_id: z.string().min(1, "Category is required"),
});

export const rejectRequestSchema = z.object({
  rejection_reason: z.string().max(255, "Rejection reason must be at most 255 characters").optional(),
});
