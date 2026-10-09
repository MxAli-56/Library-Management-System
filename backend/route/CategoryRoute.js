import express from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getAllCategories,
  getCategoryById,
} from "../controller/CategoryController.js";
import authenticate from "../middleware/Auth.js";
import { requiredAccess } from "../middleware/Access.js";

const categoryRoute = express.Router();

categoryRoute.post("/create", authenticate, requiredAccess("view_create_category"), createCategory);
categoryRoute.patch("/update/:id", authenticate, requiredAccess("view_update_category"), updateCategory);
categoryRoute.delete("/delete/:id", authenticate, requiredAccess("view_delete_category"), deleteCategory);
categoryRoute.patch("/restore/:id", authenticate, requiredAccess("view_restore_category"), restoreCategory);
categoryRoute.get("/getall", authenticate, requiredAccess("view_category"), getAllCategories);
categoryRoute.get("/:id", authenticate, requiredAccess("view_category"), getCategoryById);

export default categoryRoute;
