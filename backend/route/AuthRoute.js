import express from 'express'
import { ForgotPassword, getProfile, Login, Register, ResetPassword, updatePassword, verifyResetToken } from '../controller/AuthController.js'
import authenticate from '../middleware/Auth.js'

const route = express.Router()

route.post('/register', Register)
route.post('/login', Login)
route.get('/profile', authenticate, getProfile)
route.post('/forgot-password', ForgotPassword)
route.post('/reset-password', ResetPassword)
route.get("/verify-reset-token/:token", verifyResetToken);
route.patch('/update-password', authenticate, updatePassword)

export default route