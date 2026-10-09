import { z } from "zod";

export const allocateSchema = z.object({
  book_name: z.string().min(1, "Book name is required"),
  amount_paid_allocate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Amount paid must be a non-negative number",
    }),
});

export const returnSchema = z.object({
  amount_paid_return: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Amount paid must be a non-negative number",
    }),
});