import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";

export const assignStampToRole = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_ASSIGN_STAMP },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to assign stamps",
      });
    }

    const { role_id, access_id } = req.body;

    const roleExists = await prisma.role.findUnique({
      where: { role_id: role_id, deleted_at: null },
    });
    if (!roleExists) {
      return res.status(404).json({ message: "Role not found" });
    }

    const accessExists = await prisma.access.findUnique({
      where: { access_id: access_id, deleted_at: null },
    });
    if (!accessExists) {
      return res.status(404).json({ message: "Access not found" });
    }

    const existingAssignment = await prisma.role_access.findFirst({
      where: {
        role_id: role_id,
        access_id: access_id,
        deleted_at: null,
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        message: "This stamp is already assigned to this role",
      });
    }

    const newAssignment = await prisma.role_access.create({
      data: {
        role_id: role_id,
        access_id: access_id,
      },
      include: {
        roleaccess: true,
        accessrole: true,
      },
    });

    return res.status(201).json({
      message: "Stamp assigned to role successfully",
      data: {
        id: newAssignment.id,
        role_id: newAssignment.role_id,
        role_name: newAssignment.roleaccess?.name,
        access_id: newAssignment.access_id,
        access_name: newAssignment.accessrole?.name,
        created_at: newAssignment.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeStampFromRole = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_REMOVE_STAMP },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to remove stamps",
      });
    }

    const { role_id, access_id } = req.body;

    if (!role_id || !access_id) {
      return res.status(400).json({
        message: "role_id and access_id are required",
      });
    }

    const assignment = await prisma.role_access.findFirst({
      where: {
        role_id: role_id,
        access_id: access_id,
        deleted_at: null,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "This stamp is not assigned to this role",
      });
    }

    await prisma.role_access.update({
      where: { id: assignment.id },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Stamp removed from role successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreStampFromRole = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_ASSIGN_STAMP },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore stamps",
      });
    }

    const { role_id, access_id } = req.body;

    if (!role_id || !access_id) {
      return res.status(400).json({
        message: "role_id and access_id are required",
      });
    }

    const assignment = await prisma.role_access.findFirst({
      where: {
        role_id: role_id,
        access_id: access_id,
        deleted_at: { not: null },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        message: "This stamp is not currently removed from this role",
      });
    }

    await prisma.role_access.update({
      where: { id: assignment.id },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Stamp restored to role successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};