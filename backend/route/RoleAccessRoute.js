import express from 'express';
import {
    assignStampToRole,
    removeStampFromRole,
    restoreStampFromRole,
} from '../controller/RoleAccessController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';

const roleAccessRoute = express.Router();

roleAccessRoute.post('/assign', authenticate, requiredAccess('view_assign_stamp'), assignStampToRole);
roleAccessRoute.delete('/remove', authenticate, requiredAccess('view_remove_stamp'), removeStampFromRole);
roleAccessRoute.patch('/restore', authenticate, requiredAccess('view_restore_stamp'), restoreStampFromRole);

export default roleAccessRoute;