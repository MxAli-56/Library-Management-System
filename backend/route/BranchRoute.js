import express from 'express';
import {
    createBranch,
    getAllBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    restoreBranch,
} from '../controller/BranchController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';

const branchRoute = express.Router();

branchRoute.post('/create', authenticate, requiredAccess('view_create_branch'), createBranch);
branchRoute.patch('/update/:id', authenticate, requiredAccess('view_update_branch'), updateBranch);
branchRoute.delete('/delete/:id', authenticate, requiredAccess('view_delete_branch'), deleteBranch);
branchRoute.patch('/restore/:id', authenticate, requiredAccess('view_restore_branch'), restoreBranch);
branchRoute.get('/getall', authenticate, requiredAccess('view_branch'), getAllBranches);
branchRoute.get('/:id', authenticate, requiredAccess('view_branch'), getBranchById);

export default branchRoute;