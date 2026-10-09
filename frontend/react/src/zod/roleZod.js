import { z } from "zod";

export const roleSchema = z.object({
  name: z
    .string()
    .min(3, "Role name must be at least 3 characters")
    .max(50, "Role name can't be longer than 50 characters")
    .regex(
      /^[a-zA-Z\s]+$/,
      "Role name can only contain alphabets and spaces"
    ),
});
