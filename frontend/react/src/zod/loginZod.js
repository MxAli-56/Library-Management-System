import {z} from 'zod'

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
    .min(6, 'Password cannot be less than 6 characters')
    .max(50, 'Password cannot be greater than 50 characters')
})