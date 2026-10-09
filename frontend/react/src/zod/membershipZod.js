import { z } from "zod";

export const membershipSchema = z.object({
  name: z
    .string()
    .min(3, "Name can't be empty")
    .max(50, "Name can't be longer than 50 characters")
    .regex(
      /^[A-Za-z\s\.\-\'\,\_]+$/,
      "Membership Name can contain only alphabets, spaces, dots, hyphens, apostrophes, and commas",
    ),
  fee: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Fee must be greater than 0",
  }),
  duration: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0 && Number(val) % 1 === 0,
      {
        message: "Duration must be an integer",
      },
    ),
  discount: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Discount must be a number",
  }),
  status_id: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0 && Number(val) % 1 === 0,
      {
        message: "Status ID must be greater than 0",
      },
    ),
});

export const allocateMembershipSchema = z.object({
  membership_id: z.string().min(1, "Membership is required"),
  branch_id: z.string().min(1, "Branch is required"),
});