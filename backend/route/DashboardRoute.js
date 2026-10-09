import express from "express";
import { getStats } from "../controller/DashboardController.js";
import authenticate from "../middleware/Auth.js";
import { requiredAccess } from "../middleware/Access.js";

const dashboardRoute = express.Router();

dashboardRoute.get(
  "/stats",
  authenticate,
  requiredAccess("view_dashboard_stats"),
  getStats,
);

export default dashboardRoute;