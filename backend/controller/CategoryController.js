import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import { createCategorySchema, updateCategorySchema } from "../middleware/CategoryJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";

export const createCategory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_CREATE_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to create categories",
      });
    }

    const { error } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { name } = req.body;

    const existingCategory = await prisma.category.findFirst({
      where: { name: name },
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "Category with this name already exists",
      });
    }

    try {
      const newCategory = await prisma.category.create({
        data: {
          name: name,
        },
      });

      return res.status(201).json({
        message: "Category created successfully",
        data: {
          category_id: newCategory.category_id,
          name: newCategory.name,
          created_at: newCategory.created_at,
        },
      });
    } catch (innerError) {
      if (innerError.code === "P2002") {
        return res.status(409).json({ message: "Duplicate category name" });
      }
      throw innerError;
    }
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_UPDATE_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to update categories",
      });
    }

    const { id } = req.params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid Category ID" });
    }

    const { error } = updateCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { category_id: categoryId, deleted_at: null },
    });

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name } = req.body;

    if (name && name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: name,
          category_id: { not: categoryId },
        },
      });

      if (duplicateCategory) {
        return res.status(409).json({
          message: "Another category with this name already exists",
        });
      }
    }

    try {
      const updatedCategory = await prisma.category.update({
        where: { category_id: categoryId },
        data: {
          name: name || existingCategory.name,
        },
      });

      return res.status(200).json({
        message: "Category updated successfully",
        data: {
          category_id: updatedCategory.category_id,
          name: updatedCategory.name,
          updated_at: updatedCategory.updated_at,
        },
      });
    } catch (innerError) {
      if (innerError.code === "P2002") {
        return res.status(409).json({ message: "Duplicate category name" });
      }
      throw innerError;
    }
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_DELETE_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete categories",
      });
    }

    const { id } = req.params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid Category ID" });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { category_id: categoryId, deleted_at: null },
    });

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const bookUsing = await prisma.book.findFirst({
      where: {
        category_id: categoryId,
        deleted_at: null,
      },
    });

    if (bookUsing) {
      return res.status(409).json({
        message: "Cannot delete category. Books are assigned to it.",
      });
    }

    const deletedCategory = await prisma.category.update({
      where: { category_id: categoryId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Category deleted successfully",
      data: {
        category_id: deletedCategory.category_id,
        name: deletedCategory.name,
        deleted_at: deletedCategory.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreCategory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_RESTORE_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore categories",
      });
    }

    const { id } = req.params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid Category ID" });
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        category_id: categoryId,
        deleted_at: { not: null },
      },
    });

    if (!existingCategory) {
      return res.status(404).json({
        message: "Category not found or already active",
      });
    }

    const restoredCategory = await prisma.category.update({
      where: { category_id: categoryId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Category restored successfully",
      data: {
        category_id: restoredCategory.category_id,
        name: restoredCategory.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view categories",
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const sort_by = req.query.sort_by || "created_at";
    const order = req.query.order || "desc";

    if (!SORTABLE_FIELDS.categories.includes(sort_by)) {
      return res.status(400).json({ message: "Invalid sort field" });
    }

    const where = { deleted_at: null };

    if (req.query.search) {
      where.name = { contains: req.query.search };
    }

    const categories = await prisma.category.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sort_by]: order },
    });

    const totalCount = await prisma.category.count({ where: where });

    const formattedData = categories.map((c) => ({
      category_id: c.category_id,
      name: c.name,
      created_at: c.created_at,
    }));

    return res.status(200).json({
      data: formattedData,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        next: offset + limit < totalCount ? offset + limit : null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_CATEGORY },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view categories",
      });
    }

    const { id } = req.params;
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid Category ID" });
    }

    const category = await prisma.category.findUnique({
      where: { category_id: categoryId, deleted_at: null },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({
      data: {
        category_id: category.category_id,
        name: category.name,
        created_at: category.created_at,
        updated_at: category.updated_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
