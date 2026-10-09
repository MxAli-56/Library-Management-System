import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import { createRoleSchema, updateRoleSchema } from "../middleware/RoleJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";

export const createRole = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_CREATE_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to create roles",
      });
    }

    const { error } = createRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const { name } = req.body;

    const existingRole = await prisma.role.findFirst({
      where: {
        name: name,
      },
    });

    if (existingRole) {
      return res
        .status(409)
        .json({ message: "Role with this name already exists" });
    }

    try {
      const newRole = await prisma.role.create({
        data: {
          name: name,
        },
      });

      return res.status(201).json({
        message: "Role created successfully",
        data: {
          role_id: newRole.role_id,
          name: newRole.name,
          created_at: newRole.created_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Role with this name already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetRoleId = parseInt(id);
    if (isNaN(targetRoleId)) {
      return res.status(400).json({ message: "Invalid Role ID" });
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
        accessrole: { name: STAMPS.VIEW_UPDATE_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to update roles",
      });
    }

    const { error } = updateRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingRole = await prisma.role.findUnique({
      where: {
        role_id: targetRoleId,
        deleted_at: null,
      },
    });

    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (req.body.name && req.body.name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name: req.body.name,
          NOT: {
            role_id: targetRoleId,
          },
        },
      });

      if (nameExists) {
        return res
          .status(409)
          .json({ message: "Role with this name already exists" });
      }
    }

    try {
      const updatedRole = await prisma.role.update({
        where: { role_id: targetRoleId },
        data: {
          name: req.body.name || existingRole.name,
        },
      });

      return res.status(200).json({
        message: "Role updated successfully",
        data: {
          role_id: updatedRole.role_id,
          name: updatedRole.name,
          updated_at: updatedRole.updated_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Role with this name already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetRoleId = parseInt(id);
    if (isNaN(targetRoleId)) {
      return res.status(400).json({ message: "Invalid Role ID" });
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
        accessrole: { name: STAMPS.VIEW_DELETE_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete roles",
      });
    }

    const targetRole = await prisma.role.findUnique({
      where: {
        role_id: targetRoleId,
        deleted_at: null,
      },
    });

    if (!targetRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    const deletedRole = await prisma.role.update({
      where: { role_id: targetRoleId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Role deleted successfully",
      data: {
        role_id: deletedRole.role_id,
        name: deletedRole.name,
        deleted_at: deletedRole.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetRoleId = parseInt(id);
    if (isNaN(targetRoleId)) {
      return res.status(400).json({ message: "Invalid Role ID" });
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
        accessrole: { name: STAMPS.VIEW_RESTORE_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore roles",
      });
    }

    const targetRole = await prisma.role.findUnique({
      where: {
        role_id: targetRoleId,
        deleted_at: { not: null },
      },
    });

    if (!targetRole) {
      return res
        .status(404)
        .json({ message: "Role not found or already active" });
    }

    const restoredRole = await prisma.role.update({
      where: { role_id: targetRoleId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Role restored successfully",
      data: {
        role_id: restoredRole.role_id,
        name: restoredRole.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllRoles = async (req, res) => {
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

    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view roles",
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";

    const validSortFields = SORTABLE_FIELDS.roles;
    const validOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) sortBy = "created_at";
    if (!validOrders.includes(order)) order = "desc";

    const where = { deleted_at: null };
    if (req.query.search) {
      where.name = { contains: req.query.search };
    }

    const roles = await prisma.role.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
    });

    const totalCount = await prisma.role.count({
      where: where,
    });

    const formattedData = roles.map((r) => ({
      role_id: r.role_id,
      name: r.name,
      created_at: r.created_at,
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

export const getRoleById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetRoleId = parseInt(id);
    if (isNaN(targetRoleId)) {
      return res.status(400).json({ message: "Invalid Role ID" });
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
        accessrole: { name: STAMPS.VIEW_ROLE },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view roles",
      });
    }

    const role = await prisma.role.findUnique({
      where: {
        role_id: targetRoleId,
        deleted_at: null,
      },
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    const formattedData = {
      role_id: role.role_id,
      name: role.name,
      created_at: role.created_at,
    };

    return res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};