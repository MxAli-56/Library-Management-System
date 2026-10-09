import express from "express";
import {
  createBookRequest,
  getAllRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  getMyRequests,
} from "../controller/BookRequestController.js";
import authenticate from "../middleware/Auth.js";
import { requiredAccess } from "../middleware/Access.js";
import { uploadCover } from "../middleware/Upload.js";

const bookRequestRoute = express.Router();

bookRequestRoute.post(
  "/create",
  authenticate,
  requiredAccess("view_create_request"),
  uploadCover,
  createBookRequest,
);
bookRequestRoute.get(
  "/getall",
  authenticate,
  requiredAccess("view_request"),
  getAllRequests,
);
bookRequestRoute.get("/my-request", authenticate, getMyRequests);
bookRequestRoute.get(
  "/:id",
  authenticate,
  requiredAccess("view_request"),
  getRequestById,
);
bookRequestRoute.patch(
  "/approve/:id",
  authenticate,
  requiredAccess("view_approve_request"),
  uploadCover,
  approveRequest,
);
bookRequestRoute.delete(
  "/reject/:id",
  authenticate,
  requiredAccess("view_delete_request"),
  rejectRequest,
);

export default bookRequestRoute;
