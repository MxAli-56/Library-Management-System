import express from 'express'
import { deleteUser, getAllUsers, getUserById, insertStaff, restoreUser, updateUser } from '../controller/StaffController.js'
import authenticate from '../middleware/Auth.js'
import { requiredAccess } from '../middleware/Access.js'

const staffRoute = express.Router()

staffRoute.post('/insert', authenticate , insertStaff)
staffRoute.get('/getallusers', authenticate , requiredAccess('view_staff'), getAllUsers)
staffRoute.get('/getuser/:id', authenticate , requiredAccess('view_staff'), getUserById)
staffRoute.patch('/updateuser/:id', authenticate, requiredAccess('view_update_user'), updateUser)
staffRoute.delete('/deleteuser/:id', authenticate, requiredAccess('view_delete_user'), deleteUser)
staffRoute.patch('/restoreuser/:id', authenticate, requiredAccess('view_restore_user'), restoreUser)

export default staffRoute