import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import {
  createAccessSchema,
  updateAccessSchema,
} from "../middleware/AccessJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";

export const createAccess = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_CREATE_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to create access",
      });
    }

    const { error } = createAccessSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const { name, description, unlock_roles } = req.body;

    const existingAccess = await prisma.access.findFirst({
      where: {
        name: name,
      },
    });

    if (existingAccess) {
      return res
        .status(409)
        .json({ message: "Access with this name already exists" });
    }

    try {
      const newAccess = await prisma.access.create({
        data: {
          name: name,
          description: description,
          unlock_roles: unlock_roles,
        },
      });

      return res.status(201).json({
        message: "Access created successfully",
        data: {
          access_id: newAccess.access_id,
          name: newAccess.name,
          description: newAccess.description,
          created_at: newAccess.created_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Access with this name already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateAccess = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetAccessId = parseInt(id);
    if (isNaN(targetAccessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
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
        accessrole: { name: STAMPS.VIEW_UPDATE_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to update access",
      });
    }

    const { error } = updateAccessSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingAccess = await prisma.access.findUnique({
      where: {
        access_id: targetAccessId,
        deleted_at: null,
      },
    });

    if (!existingAccess) {
      return res.status(404).json({ message: "Access not found" });
    }

    if (req.body.name && req.body.name !== existingAccess.name) {
      const nameExists = await prisma.access.findFirst({
        where: {
          name: req.body.name,
          NOT: {
            access_id: targetAccessId,
          },
        },
      });

      if (nameExists) {
        return res
          .status(409)
          .json({ message: "Access with this name already exists" });
      }
    }

    try {
      const updatedAccess = await prisma.access.update({
        where: { access_id: targetAccessId },
        data: {
          name: req.body.name || existingAccess.name,
          description: req.body.description ?? existingAccess.description,
          unlock_roles: req.body.unlock_roles || existingAccess.unlock_roles,
        },
      });

      return res.status(200).json({
        message: "Access updated successfully",
        data: {
          access_id: updatedAccess.access_id,
          name: updatedAccess.name,
          created_at: updatedAccess.created_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Access with this name already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteAccess = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetAccessId = parseInt(id);
    if (isNaN(targetAccessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
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
        accessrole: { name: STAMPS.VIEW_DELETE_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete access",
      });
    }

    const targetAccess = await prisma.access.findUnique({
      where: {
        access_id: targetAccessId,
        deleted_at: null,
      },
    });

    if (!targetAccess) {
      return res.status(404).json({ message: "Access not found" });
    }

    const deletedAccess = await prisma.access.update({
      where: { access_id: targetAccessId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Access deleted successfully",
      data: {
        access_id: deletedAccess.access_id,
        name: deletedAccess.name,
        deleted_at: deletedAccess.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreAccess = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetAccessId = parseInt(id);
    if (isNaN(targetAccessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
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
        accessrole: { name: STAMPS.VIEW_RESTORE_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore access",
      });
    }

    const targetAccess = await prisma.access.findUnique({
      where: {
        access_id: targetAccessId,
        deleted_at: { not: null },
      },
    });

    if (!targetAccess) {
      return res
        .status(404)
        .json({ message: "Access not found or already active" });
    }

    const restoredAccess = await prisma.access.update({
      where: { access_id: targetAccessId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Access restored successfully",
      data: {
        access_id: restoredAccess.access_id,
        name: restoredAccess.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllAccess = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view access",
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";

    const validSortFields = SORTABLE_FIELDS.accesses;
    const validOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) sortBy = "created_at";
    if (!validOrders.includes(order)) order = "desc";

    const where = { deleted_at: null };
    if (req.query.search) {
      where.name = { contains: req.query.search };
    }

    const accessList = await prisma.access.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
    });

    const totalCount = await prisma.access.count({
      where: where,
    });

    const formattedData = accessList.map((a) => ({
      access_id: a.access_id,
      name: a.name,
      description: a.description || null,
      created_at: a.created_at,
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

export const getAccessById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetAccessId = parseInt(id);
    if (isNaN(targetAccessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
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
        accessrole: { name: STAMPS.VIEW_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view access",
      });
    }

    const access = await prisma.access.findUnique({
      where: {
        access_id: targetAccessId,
        deleted_at: null,
      },
    });

    if (!access) {
      return res.status(404).json({ message: "Access not found" });
    }

    const formattedData = {
      access_id: access.access_id,
      name: access.name,
      description: access.description,
      unlock_roles: access.unlock_roles,
      created_at: access.created_at,
      updated_at: access.updated_at,
    };

    return res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAccessRoles = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetAccessId = parseInt(id);
    if (isNaN(targetAccessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
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
        accessrole: { name: STAMPS.VIEW_ASSIGN_ACCESS },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to assign accesses",
      });
    }

    const access = await prisma.access.findUnique({
      where: {
        access_id: targetAccessId,
        deleted_at: null,
      },
    });

    if (!access) {
      return res.status(404).json({ message: "Access not found" });
    }

    const allRoles = await prisma.role.findMany({
      where: { deleted_at: null },
      select: {
        role_id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const assignedRoleAccess = await prisma.role_access.findMany({
      where: {
        access_id: targetAccessId,
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });

    const assignedRoleIds = assignedRoleAccess.map((ra) => ra.role_id);

    return res.status(200).json({
      access: {
        access_id: access.access_id,
        name: access.name,
        description: access.description,
      },
      allRoles: allRoles,
      assignedRoleIds: assignedRoleIds,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateAccessRoles = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const accessId = parseInt(id);
    if (isNaN(accessId)) {
      return res.status(400).json({ message: "Invalid Access ID" });
    }

    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ message: "roleIds must be an array" });
    }

    const access = await prisma.access.findUnique({
      where: { access_id: accessId, deleted_at: null },
    });

    if (!access) {
      return res.status(404).json({ message: "Access not found" });
    }

    const currentRows = await prisma.role_access.findMany({
      where: { access_id: accessId },
    });

    const currentActiveIds = currentRows
      .filter((r) => r.deleted_at === null)
      .map((r) => r.role_id);

    const newRoleIds = roleIds.map((r) => parseInt(r));

    const toAdd = newRoleIds.filter((rid) => !currentActiveIds.includes(rid));
    const toRemove = currentActiveIds.filter(
      (rid) => !newRoleIds.includes(rid),
    );

    for (const roleId of toAdd) {
      const roleExists = await prisma.role.findUnique({
        where: { role_id: roleId, deleted_at: null },
      });

      if (!roleExists) {
        return res.status(400).json({ message: `Role ${roleId} not found` });
      }

      const existingRow = await prisma.role_access.findFirst({
        where: { role_id: roleId, access_id: accessId },
      });

      if (existingRow) {
        await prisma.role_access.update({
          where: { id: existingRow.id },
          data: { deleted_at: null },
        });
      } else {
        await prisma.role_access.create({
          data: { role_id: roleId, access_id: accessId },
        });
      }
    }

    for (const roleId of toRemove) {
      const rowToRemove = currentRows.find(
        (r) => r.role_id === roleId && r.deleted_at === null,
      );

      if (rowToRemove) {
        await prisma.role_access.update({
          where: { id: rowToRemove.id },
          data: { deleted_at: new Date() },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Roles updated successfully",
      data: { added: toAdd.length, removed: toRemove.length },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};