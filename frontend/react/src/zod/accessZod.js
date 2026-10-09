import { z } from "zod";

export const accessSchema = z.object({
  name: z
    .string()
    .min(3, "Access name must be at least 3 characters")
    .max(50, "Access name can't be longer than 50 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Access name can only contain letters, numbers, and underscores",
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(150, "Description can't be longer than 150 characters"),
});
