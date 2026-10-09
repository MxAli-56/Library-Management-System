import express from 'express';
import {createAccess, getAllAccess, getAccessById, updateAccess, deleteAccess, restoreAccess, getAccessRoles, updateAccessRoles } from '../controller/AccessController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';

const accessRoute = express.Router();

accessRoute.post('/create', authenticate, requiredAccess('view_create_access'), createAccess);
accessRoute.patch('/update/:id', authenticate, requiredAccess('view_update_access'), updateAccess);
accessRoute.delete('/delete/:id', authenticate, requiredAccess('view_delete_access'), deleteAccess);
accessRoute.patch('/restore/:id', authenticate, requiredAccess('view_restore_access'), restoreAccess);
accessRoute.get('/getall', authenticate, requiredAccess('view_access'), getAllAccess);
accessRoute.get('/:id/roles', authenticate, requiredAccess('view_assign_access'), getAccessRoles);
accessRoute.patch('/:id/roles', authenticate, requiredAccess('view_assign_access'), updateAccessRoles);
accessRoute.get('/:id', authenticate, requiredAccess('view_access'), getAccessById);

export default accessRoute;