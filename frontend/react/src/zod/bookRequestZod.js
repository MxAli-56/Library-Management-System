import { z } from "zod";

export const bookRequestSchema = z.object({
  name: z
    .string()
    .min(3, "Book name must be at least 3 characters")
    .max(50, "Book name cannot be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Book name can only contain letters, spaces, dots, hyphens, apostrophes, and commas",
    ),

  author: z
    .string()
    .min(3, "Author name must be at least 3 characters")
    .max(50, "Author name cannot be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Author name can only contain letters, spaces, dots, hyphens, apostrophes, and commas",
    ),

  isbn: z
  .string()
  .min(10, "ISBN must be at least 10 characters")
  .max(17, "ISBN must be at most 17 characters")
  .regex(
    /^(?=(?:\D*\d){9,12}\D*[\dX]$)(?:\d[\s-]?){9,12}[\dX]$/i,
    "ISBN must contain 10 or 13 digits, with optional hyphens or spaces"
  ),
})