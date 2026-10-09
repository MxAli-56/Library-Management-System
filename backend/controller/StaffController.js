import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "../config/db.js";
import { createStaffSchema, updateStaffSchema } from "../middleware/StaffJoi.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";
import { getStaffBranchScope } from "../utils/branchFilter.js";

dotenv.config();

export const insertStaff = async (req, res) => {
  try {
    const { name, email, password, role_id, branch_ids } = req.body;

    const { error } = createStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingEmail) {
      return res.status(409).json({ message: "Email already exist" });
    }

    const finalpassword = password || "default123";

    const hashedPassword = await bcrypt.hash(finalpassword, 10);

    const newStaff = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
      },
    });

    await prisma.user_role.create({
      data: {
        user_id: newStaff.user_id,
        role_id: role_id,
      },
    });

    for (const branchId of branch_ids) {
      await prisma.user_branch.create({
        data: {
          user_id: newStaff.user_id,
          branch_id: branchId,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff Created Successfully",
      data: {
        user_id: newStaff.user_id,
        name: newStaff.name,
        email: newStaff.email,
        role_id: role_id,
        branch_ids: branch_ids,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllUsers = async (req, res) => {
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

    const userStamps = await prisma.role_access.findMany({
      where: { role_id: { in: currentRoleIds }, deleted_at: null },
      include: { accessrole: true },
    });

    const stampNames = userStamps.map((s) => s.accessrole?.name);
    const callerCanAllocate = stampNames.includes("view_create_membership");

    const viewableRoleNames = new Set();
    userStamps.forEach((s) => {
      const stampName = s.accessrole?.name || "";
      if (stampName.includes("_staff")) {
        const unlockRoles = s.accessrole?.unlock_roles;
        if (Array.isArray(unlockRoles)) {
          unlockRoles.forEach((roleName) => viewableRoleNames.add(roleName));
        }
      }
    });
    const viewableRoles = Array.from(viewableRoleNames);

    if (viewableRoles.length === 0) {
      return res.status(403).json({ message: "No viewable roles" });
    }

    const viewableRoleRecords = await prisma.role.findMany({
      where: { name: { in: viewableRoles }, deleted_at: null },
      select: { role_id: true, name: true },
    });
    const viewableRoleIds = viewableRoleRecords.map((r) => r.role_id);

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";
    const validSortFields = SORTABLE_FIELDS.users;
    const validOrders = ["asc", "desc"];
    if (!validSortFields.includes(sortBy)) sortBy = "created_at";
    if (!validOrders.includes(order)) order = "desc";

    const includeRoleless =
      req.query.includeRoleless === "true" && callerCanAllocate;

    const scope = await getStaffBranchScope(userId);

    const where = {
      deleted_at: null,
    };

    if (includeRoleless) {
      where.OR = [
        { userrole: { some: { role_id: { in: viewableRoleIds } } } },
        { userrole: { none: {} } },
      ];
    } else {
      where.userrole = {
        some: {
          role_id: { in: viewableRoleIds },
        },
      };
    }

    if (!scope.isPrivileged && !includeRoleless) {
      where.userbranch = {
        some: {
          branch_id: { in: scope.branchIds },
          deleted_at: null,
        },
      };
    }

    if (req.query.search) {
      const isNumeric = /^\d+$/.test(req.query.search);
      const searchOR = isNumeric
        ? [
            { user_id: parseInt(req.query.search) },
            { name: { contains: req.query.search } },
            { email: { contains: req.query.search } },
          ]
        : [
            { name: { contains: req.query.search } },
            { email: { contains: req.query.search } },
          ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOR }];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }

    if (req.query.role) {
      const filterRole = viewableRoleRecords.find(
        (r) => r.name === req.query.role,
      );
      if (filterRole) {
        where.userrole = {
          some: {
            role_id: filterRole.role_id,
          },
        };
      }
    }

    const users = await prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
      include: {
        userrole: { include: { roleuser: true } },
        userbranch: { include: { branchuser: true } },
        usermembership: {
          include: {
            membershipuser: true,
            branchuser: true,
          },
        },
      },
    });

    const totalCount = await prisma.user.count({ where });

    const formattedData = users.map((u) => ({
      id: u.user_id,
      name: u.name,
      email: u.email,
      roles: u.userrole.map((ur) => ur.roleuser?.name),
      branches: u.userbranch.map((ub) => ub.branchuser?.name),
      branch_ids: u.userbranch.map((ub) => ub.branchuser?.branch_id),
      membership: u.usermembership?.membershipuser?.name || null,
      membership_branch: u.usermembership?.branchuser?.name || null,
      created_at: u.created_at,
    }));

    return res.status(200).json({
      data: formattedData,
      pagination: {
        total: totalCount,
        limit,
        offset,
        next: offset + limit < totalCount ? offset + limit : null,
      },
      viewableRoles,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const currentUserRole = await prisma.user_role.findMany({
      where: {
        deleted_at: null,
        user_id: userId,
      },
      select: {
        role_id: true,
      },
    });

    const currentUserRoleIds = currentUserRole.map((ur) => ur.role_id);

    if (currentUserRoleIds.length === 0) {
      return res.status(404).json({ message: "No roles assigned" });
    }

    const hasViewStaff = await prisma.role_access.findFirst({
      where: {
        deleted_at: null,
        role_id: { in: currentUserRoleIds },
        accessrole: {
          name: STAMPS.VIEW_STAFF,
        },
      },
    });

    if (!hasViewStaff) {
      return res
        .status(403)
        .json({ message: "You don't have permission to access this" });
    }

    const currentUserStamps = await prisma.role_access.findMany({
      where: {
        deleted_at: null,
        role_id: { in: currentUserRoleIds },
      },
      include: {
        accessrole: true,
      },
    });

    let allowedRoleNames = [];

    currentUserStamps.forEach((stamp) => {
      const unlockRoles = stamp.accessrole.unlock_roles;
      if (Array.isArray(unlockRoles)) {
        allowedRoleNames.push(...unlockRoles);
      }
    });

    allowedRoleNames = [...new Set(allowedRoleNames)];

    const allowedRoles = await prisma.role.findMany({
      where: {
        deleted_at: null,
        name: { in: allowedRoleNames },
      },
    });

    const allowedRoleIds = allowedRoles.map((r) => r.role_id);

    if (allowedRoleIds.length === 0) {
      return res.status(403).json({
        message: "No valid permissions to view users",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        deleted_at: null,
        user_id: targetUserId,
      },
      include: {
        userrole: {
          include: {
            roleuser: true,
          },
        },
        userbranch: {
          include: {
            branchuser: true,
          },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUserRoleId = targetUser.userrole.map((tu) => tu.role_id);

    const canView = targetUserRoleId.some((roleid) => {
      return allowedRoleIds.includes(roleid);
    });

    if (!canView) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view this" });
    }

    const formattedUser = {
      id: targetUser.user_id,
      name: targetUser.name,
      email: targetUser.email,
      roles: targetUser.userrole.map((ur) => ur.roleuser?.name),
      branches: targetUser.userbranch.map((ub) => ub.branchuser?.name),
      created_at: targetUser.created_at,
    };

    return res.status(200).json(formattedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const currentUserRole = await prisma.user_role.findMany({
      where: {
        deleted_at: null,
        user_id: userId,
      },
      select: {
        role_id: true,
      },
    });

    const currentUserRoleIds = currentUserRole.map((ur) => ur.role_id);

    if (currentUserRoleIds.length === 0) {
      return res.status(404).json({ message: "No roles assigned" });
    }

    const hasViewUpdateUser = await prisma.role_access.findFirst({
      where: {
        deleted_at: null,
        role_id: { in: currentUserRoleIds },
        accessrole: {
          name: STAMPS.VIEW_UPDATE_USER,
        },
      },
    });

    if (!hasViewUpdateUser) {
      return res
        .status(403)
        .json({ message: "You don't have permission to access this" });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        deleted_at: null,
        user_id: targetUserId,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { error } = updateStaffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    if (req.body.email && req.body.email !== targetUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: {
          email: req.body.email,
        },
      });
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exist" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        deleted_at: null,
        user_id: targetUserId,
      },
      data: {
        name: req.body.name || targetUser.name,
        email: req.body.email || targetUser.email,
      },
    });

    if (req.body.role_id) {
      const roleExist = await prisma.role.findUnique({
        where: {
          deleted_at: null,
          role_id: req.body.role_id,
        },
      });

      if (!roleExist) {
        return res.status(409).json({ message: "Role not found" });
      }

      const existingRole = await prisma.user_role.findUnique({
        where: {
          user_id_role_id: {
            user_id: targetUserId,
            role_id: req.body.role_id,
          },
        },
      });

      if (existingRole) {
        await prisma.user_role.update({
          where: {
            user_id_role_id: {
              user_id: targetUserId,
              role_id: req.body.role_id,
            },
          },
          data: {
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.user_role.create({
          data: {
            user_id: targetUserId,
            role_id: req.body.role_id,
          },
        });
      }
    }

    if (req.body.role_ids && Array.isArray(req.body.role_ids)) {
      await prisma.user_role.deleteMany({
        where: { user_id: targetUserId },
      });

      for (const roleId of req.body.role_ids) {
        const roleExist = await prisma.role.findUnique({
          where: { role_id: roleId, deleted_at: null },
        });
        if (!roleExist) {
          return res.status(404).json({ message: `Role ${roleId} not found` });
        }

        await prisma.user_role.create({
          data: {
            user_id: targetUserId,
            role_id: roleId,
          },
        });
      }
    }

    if (req.body.branch_id) {
      const branchExist = await prisma.branch.findUnique({
        where: {
          deleted_at: null,
          branch_id: req.body.branch_id,
        },
      });

      if (!branchExist) {
        return res.status(409).json({ message: "Branch not found" });
      }

      const existingBranch = await prisma.user_branch.findUnique({
        where: {
          user_id_branch_id: {
            user_id: targetUserId,
            branch_id: req.body.branch_id,
          },
        },
      });

      if (existingBranch) {
        await prisma.user_branch.update({
          where: {
            user_id_branch_id: {
              user_id: targetUserId,
              branch_id: req.body.branch_id,
            },
          },
          data: {
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.user_branch.create({
          data: {
            user_id: targetUserId,
            branch_id: req.body.branch_id,
          },
        });
      }
    }

    if (req.body.branch_ids && Array.isArray(req.body.branch_ids)) {
      await prisma.user_branch.deleteMany({
        where: { user_id: targetUserId },
      });

      for (const branchId of req.body.branch_ids) {
        const branchExist = await prisma.branch.findUnique({
          where: { branch_id: branchId, deleted_at: null },
        });
        if (!branchExist) {
          return res
            .status(404)
            .json({ message: `Branch ${branchId} not found` });
        }

        await prisma.user_branch.create({
          data: {
            user_id: targetUserId,
            branch_id: branchId,
          },
        });
      }
    }


    let membershipExist = null;

    if (req.body.membership_id) {
      membershipExist = await prisma.membership.findUnique({
        where: { membership_id: req.body.membership_id, deleted_at: null },
      });
      if (!membershipExist) {
        return res.status(404).json({ message: "Membership not found" });
      }

      const existingMemberhip = await prisma.user_membership.findUnique({
        where: { user_id: targetUserId },
      });

      if (existingMemberhip) {
        await prisma.user_membership.update({
          where: { user_id: targetUserId },
          data: {
            membership_id: req.body.membership_id,
            start_date: new Date(),
            end_date: new Date(
              Date.now() + membershipExist.duration * 24 * 60 * 60 * 1000,
            ),
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.user_membership.create({
          data: {
            user_id: targetUserId,
            membership_id: req.body.membership_id,
            start_date: new Date(),
            end_date: new Date(
              Date.now() + membershipExist.duration * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }
    }

    const formattedData = {
      id: updatedUser.user_id,
      name: updatedUser.name,
      email: updatedUser.email, 
      roles: await prisma.user_role
        .findMany({
          where: { user_id: targetUserId, deleted_at: null },
          include: { roleuser: true },
        })
        .then((ur) => ur.map((u) => u.roleuser?.name)),
      branches: await prisma.user_branch
        .findMany({
          where: { user_id: targetUserId, deleted_at: null },
          include: { branchuser: true },
        })
        .then((ub) => ub.map((u) => u.branchuser?.name)),
      membership: await prisma.user_membership.findUnique({
        where: { user_id: targetUserId },
        include: { membershipuser: true },
      }),
      created_at: updatedUser.created_at,
    };

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetUserId = parseInt(id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    if (currentRoleIds.length === 0) {
      return res.status(403).json({ message: "No roles assigned" });
    }

    const hasViewDeleteUser = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: {
          name: STAMPS.VIEW_DELETE_USER,
        },
      },
    });

    if (!hasViewDeleteUser) {
      return res.status(403).json({
        message: "You don't have permission to delete users",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        user_id: targetUserId,
        deleted_at: null,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const deletedUser = await prisma.user.update({
      where: { user_id: targetUserId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: {
        id: deletedUser.user_id,
        name: deletedUser.name,
        email: deletedUser.email,
        deleted_at: deletedUser.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetUserId = parseInt(id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    const hasViewRestoreUser = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_RESTORE_USER },
      },
    });

    if (!hasViewRestoreUser) {
      return res
        .status(403)
        .json({ message: "You don't have permission to restore users" });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        user_id: targetUserId,
        deleted_at: { not: null }, 
      },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ message: "User not found or already active" });
    }

    const restoredUser = await prisma.user.update({
      where: { user_id: targetUserId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User restored successfully",
      data: {
        id: restoredUser.user_id,
        name: restoredUser.name,
        email: restoredUser.email,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};