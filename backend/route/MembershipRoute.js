import express from "express";
import {allocateMembership, createMembership, deleteMembership, getAllMembership, getAvailablePlans, getMembershipById, getMyMembership, restoreMembership, updateMembership} from "../controller/MembershipController.js";
import authenticate from "../middleware/Auth.js";
import { requiredAccess } from "../middleware/Access.js";

const membershipRoute = express.Router()

membershipRoute.post('/create', authenticate, requiredAccess('view_create_membership'), createMembership)
membershipRoute.patch('/update/:id', authenticate, requiredAccess('view_update_membership'), updateMembership)
membershipRoute.delete('/delete/:id', authenticate, requiredAccess('view_delete_membership'), deleteMembership)
membershipRoute.patch('/restore/:id', authenticate, requiredAccess('view_restore_membership'), restoreMembership)
membershipRoute.get('/getall', authenticate , requiredAccess('view_membership'), getAllMembership)
membershipRoute.get("/available", authenticate, getAvailablePlans);
membershipRoute.get("/my-membership", authenticate, getMyMembership);
membershipRoute.post("/allocate", authenticate, requiredAccess('view_create_membership'), allocateMembership);
membershipRoute.get('/:id', authenticate , requiredAccess('view_membership'), getMembershipById)

export default membershipRoute