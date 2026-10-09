import express from 'express';
import {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole,
    restoreRole,
} from '../controller/RoleController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';

const roleRoute = express.Router();

roleRoute.post('/create', authenticate, requiredAccess('view_create_role'), createRole);
roleRoute.patch('/update/:id', authenticate, requiredAccess('view_update_role'), updateRole);
roleRoute.delete('/delete/:id', authenticate, requiredAccess('view_delete_role'), deleteRole);
roleRoute.patch('/restore/:id', authenticate, requiredAccess('view_restore_role'), restoreRole);
roleRoute.get('/getall', authenticate, requiredAccess('view_role'), getAllRoles);
roleRoute.get('/:id', authenticate, requiredAccess('view_role'), getRoleById);

export default roleRoute;