import { z } from "zod";

export const branchSchema = z.object({
  name: z
    .string()
    .min(3, "Branch name must be at least 3 characters")
    .max(50, "Branch name can't be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,]+$/,
      "Branch name can only contain alphabets, spaces, dots, hyphens, apostrophes, and commas"
    ),
  location: z
    .string()
    .min(3, "Location must be at least 3 characters")
    .max(100, "Location can't be longer than 100 characters"),
});
