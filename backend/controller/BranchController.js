import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import { createBranchSchema, updateBranchSchema } from "../middleware/BranchJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";

export const createBranch = async (req, res) => {
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
                accessrole: { name: STAMPS.VIEW_CREATE_BRANCH },
            },
        });

        if (!hasAccess) {
            return res.status(403).json({
                message: "You don't have permission to create branches",
            });
        }

        const { error } = createBranchSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                message: error.details[0].message,
            });
        }

        const { name, location } = req.body;

        const existingBranch = await prisma.branch.findFirst({
            where: {
                name: name,
            },
        });

        if (existingBranch) {
            return res.status(409).json({ message: "Branch with this name already exists" });
        }

        try {
            const newBranch = await prisma.branch.create({
                data: {
                    name: name,
                    location: location,
                },
            });

            return res.status(201).json({
                message: "Branch created successfully",
                data: {
                    branch_id: newBranch.branch_id,
                    name: newBranch.name,
                    location: newBranch.location,
                    created_at: newBranch.created_at,
                },
            });
        } catch (error) {
            if (error.code === "P2002") {
                return res
                    .status(409)
                    .json({ message: "Branch with this name already exists" });
            }
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateBranch = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBranchId = parseInt(id);
    if (isNaN(targetBranchId)) {
      return res.status(400).json({ message: "Invalid Branch ID" });
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
        accessrole: { name: STAMPS.VIEW_UPDATE_BRANCH },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to update branches",
      });
    }

    const { error } = updateBranchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingBranch = await prisma.branch.findUnique({
      where: {
        branch_id: targetBranchId,
        deleted_at: null,
      },
    });

    if (!existingBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (req.body.name && req.body.name !== existingBranch.name) {
      const nameExists = await prisma.branch.findFirst({
        where: {
          name: req.body.name,
          NOT: {
            branch_id: targetBranchId,
          },
        },
      });

      if (nameExists) {
        return res
          .status(409)
          .json({ message: "Branch with this name already exists" });
      }
    }

    try {
      const updatedBranch = await prisma.branch.update({
        where: { branch_id: targetBranchId },
        data: {
          name: req.body.name || existingBranch.name,
          location: req.body.location || existingBranch.location,
        },
      });

      return res.status(200).json({
        message: "Branch updated successfully",
        data: {
          branch_id: updatedBranch.branch_id,
          name: updatedBranch.name,
          location: updatedBranch.location,
          updated_at: updatedBranch.updated_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Branch with this name already exists" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBranchId = parseInt(id);
    if (isNaN(targetBranchId)) {
      return res.status(400).json({ message: "Invalid Branch ID" });
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
        accessrole: { name: STAMPS.VIEW_DELETE_BRANCH },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete branches",
      });
    }

    const targetBranch = await prisma.branch.findUnique({
      where: {
        branch_id: targetBranchId,
        deleted_at: null,
      },
    });

    if (!targetBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const deletedBranch = await prisma.branch.update({
      where: { branch_id: targetBranchId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Branch deleted successfully",
      data: {
        branch_id: deletedBranch.branch_id,
        name: deletedBranch.name,
        deleted_at: deletedBranch.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreBranch = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBranchId = parseInt(id);
    if (isNaN(targetBranchId)) {
      return res.status(400).json({ message: "Invalid Branch ID" });
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
        accessrole: { name: STAMPS.VIEW_RESTORE_BRANCH },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore branches",
      });
    }

    const targetBranch = await prisma.branch.findUnique({
      where: {
        branch_id: targetBranchId,
        deleted_at: { not: null },
      },
    });

    if (!targetBranch) {
      return res
        .status(404)
        .json({ message: "Branch not found or already active" });
    }

    const restoredBranch = await prisma.branch.update({
      where: { branch_id: targetBranchId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Branch restored successfully",
      data: {
        branch_id: restoredBranch.branch_id,
        name: restoredBranch.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllBranches = async (req, res) => {
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
                accessrole: { name: STAMPS.VIEW_BRANCH },
            },
        });

        if (!hasAccess) {
            return res.status(403).json({
                message: "You don't have permission to view branches",
            });
        }

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        let sortBy = req.query.sort_by || "created_at";
        let order = req.query.order || "desc";

        const validSortFields = SORTABLE_FIELDS.branches;
        const validOrders = ["asc", "desc"];

        if (!validSortFields.includes(sortBy)) sortBy = "created_at";
        if (!validOrders.includes(order)) order = "desc";

        const where = { deleted_at: null };
        if (req.query.search) {
            where.OR = [
                { name: { contains: req.query.search } },
                { location: { contains: req.query.search } },
            ];
        }

        const branches = await prisma.branch.findMany({
            where: where,
            take: limit,
            skip: offset,
            orderBy: { [sortBy]: order },
        });

        const totalCount = await prisma.branch.count({
            where: where,
        });

        const formattedData = branches.map((b) => ({
            branch_id: b.branch_id,
            name: b.name,
            location: b.location,
            created_at: b.created_at,
            updated_at: b.updated_at,
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

export const getBranchById = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;
        const targetBranchId = parseInt(id);
        if (isNaN(targetBranchId)) {
            return res.status(400).json({ message: "Invalid Branch ID" });
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
                accessrole: { name: STAMPS.VIEW_BRANCH },
            },
        });

        if (!hasAccess) {
            return res.status(403).json({
                message: "You don't have permission to view branches",
            });
        }

        const branch = await prisma.branch.findUnique({
            where: {
                branch_id: targetBranchId,
                deleted_at: null,
            },
        });

        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const formattedData = {
            branch_id: branch.branch_id,
            name: branch.name,
            location: branch.location,
            created_at: branch.created_at,
            updated_at: branch.updated_at,
        };

        return res.status(200).json({
            data: formattedData,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};