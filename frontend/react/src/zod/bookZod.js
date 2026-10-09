import { z } from "zod";

export const bookSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Name can only contain letters, spaces, dots, hyphens, apostrophes, and commas",
    ),
  author: z
    .string()
    .min(3, "Author must be at least 3 characters")
    .max(50, "Author cannot be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Author can only contain letters, spaces, dots, hyphens, apostrophes, and commas",
    ),
  isbn: z
    .string()
    .min(10, "ISBN must be at least 10 characters")
    .max(13, "ISBN cannot be longer than 13 characters"),
  total_price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: "Total price must be a non-negative number",
  }),
  borrow_price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: "Borrow price must be a non-negative number",
  }),
  quantity: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) % 1 === 0,
      {
        message: "Quantity must be a positive integer",
      },
    ),
  category_id: z.string().min(1, "Category is required"),
  fine_per_day: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Fine per day must be a positive number",
    }),
  branch_id: z.string().optional(),
});
