import { z } from "zod";

export const userSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Name can only contain letters, spaces, dots, hyphens, apostrophes, and commas",
    ),
  email: z.string().email("Invalid email address"),
  role_id: z.string().min(1, "Role is required"),
});