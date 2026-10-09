import {z} from 'zod'

export const registerSchema = z.object({
    name: z.string()
    .regex(/^[A-Za-z\s]+$/, 'Name can only contain letters and spaces')
    .min(3, 'Password cannot be less than 3 characters')
    .max(50, 'Password cannot be greater than 50 characters'),

    email: z.string().email('Invalid email address'),

    password: z.string()
    .min(6, 'Password cannot be less than 6 characters')
    .max(50, 'Password cannot be greater than 50 characters'),
    
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password does not match",
    path: ["confirmPassword"]
})