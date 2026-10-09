import dotenv from "dotenv";
import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import {
  createMembershipSchema,
  updateMembershipSchema,
} from "../middleware/MembershipJoi.js";
import { DEFAULT_NEW_USER_ROLE } from "../config/defaults.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";
import { getStaffBranchScope } from "../utils/branchFilter.js";

dotenv.config();

export const createMembership = async (req, res) => {
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
        accessrole: {
          name: STAMPS.VIEW_CREATE_MEMBERSHIP,
        },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to access this",
      });
    }

    const { name, fee, duration, discount, status_id } = req.body;

    const { error } = createMembershipSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const existingMembership = await prisma.membership.findFirst({
      where: {
        name: name,
      },
    });

    if (existingMembership) {
      return res.status(409).json({ message: "Name already exist" });
    }

    const validStatusId = await prisma.status.findUnique({
      where: {
        status_id: status_id,
      },
    });

    if (!validStatusId) {
      return res.status(409).json({ message: "Status not found" });
    }

    try {
      const newMembership = await prisma.membership.create({
        data: {
          name: name,
          fee: fee,
          duration: duration,
          discount: discount,
          status_id: status_id,
        },
        include: {
          membershipstatus: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Membership created successfully",
        data: {
          membership_id: newMembership.membership_id,
          name: newMembership.name,
          fee: newMembership.fee,
          duration: newMembership.duration,
          discount: newMembership.discount,
          status: newMembership.membershipstatus?.name,
          created_at: newMembership.created_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Name already exist" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const targetMembershipId = parseInt(id);

    if (isNaN(targetMembershipId)) {
      return res.status(400).json({ message: "Invalid Membership ID" });
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
        accessrole: {
          name: STAMPS.VIEW_UPDATE_MEMBERSHIP,
        },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to access this",
      });
    }

    const { error } = updateMembershipSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        deleted_at: null,
        membership_id: targetMembershipId,
      },
    });

    if (!existingMembership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    if (req.body.name && req.body.name !== existingMembership.name) {
      const nameExist = await prisma.membership.findFirst({
        where: {
          name: req.body.name,
          deleted_at: null,
          NOT: {
            membership_id: targetMembershipId,
          },
        },
      });

      if (nameExist) {
        return res
          .status(409)
          .json({ message: "A membership with this name already exist" });
      }
    }

    if (req.body.status_id) {
      const validStatusId = await prisma.status.findUnique({
        where: {
          status_id: req.body.status_id,
          deleted_at: null,
        },
      });

      if (!validStatusId) {
        return res.status(404).json({ message: "Status not found" });
      }
    }

    try {
      const updateMembership = await prisma.membership.update({
        where: {
          membership_id: targetMembershipId,
        },
        data: {
          name: req.body.name || existingMembership.name,
          fee: req.body.fee || existingMembership.fee,
          duration: req.body.duration || existingMembership.duration,
          discount: req.body.discount || existingMembership.discount,
          status_id: req.body.status_id || existingMembership.status_id,
        },
        include: {
          membershipstatus: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Membership updated successfully",
        data: {
          name: updateMembership.name,
          fee: updateMembership.fee,
          duration: updateMembership.duration,
          discount: updateMembership.discount,
          status_id: updateMembership.membershipstatus?.name,
          updated_at: updateMembership.updated_at,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "A membership with this name already exist" });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetMembershipId = parseInt(id);

    if (isNaN(targetMembershipId)) {
      return res.status(400).json({ message: "Invalid Membership ID" });
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
        accessrole: {
          name: STAMPS.VIEW_DELETE_MEMBERSHIP,
        },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete users",
      });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        membership_id: targetMembershipId,
        deleted_at: null,
      },
    });

    if (!targetMembership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const deletedMembership = await prisma.membership.update({
      where: { membership_id: targetMembershipId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Membership deleted successfully",
      data: {
        id: deletedMembership.membership_id,
        name: deletedMembership.name,
        deleted_at: deletedMembership.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreMembership = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetMembershipId = parseInt(id);

    if (isNaN(targetMembershipId)) {
      return res.status(400).json({ message: "Invalid Membership ID" });
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
        accessrole: { name: STAMPS.VIEW_RESTORE_MEMBERSHIP },
      },
    });

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You don't have permission to restore users" });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        membership_id: targetMembershipId,
        deleted_at: { not: null },
      },
    });

    if (!targetMembership) {
      return res
        .status(404)
        .json({ message: "User not found or already active" });
    }

    const restoredMembership = await prisma.membership.update({
      where: { membership_id: targetMembershipId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User restored successfully",
      data: {
        id: restoredMembership.membership_id,
        name: restoredMembership.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllMembership = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_MEMBERSHIP },
      },
    });

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view memberships" });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";

    const validSortFields = SORTABLE_FIELDS.memberships;
    const validOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) sortBy = "created_at";
    if (!validOrders.includes(order)) order = "desc";

    const where = { deleted_at: null };
    if (req.query.search) {
      where.name = { contains: req.query.search };
    }

    const memberships = await prisma.membership.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
      include: {
        membershipstatus: true,
      },
    });

    const totalCount = await prisma.membership.count({
      where: where,
    });

    const formattedData = memberships.map((m) => ({
      membership_id: m.membership_id,
      name: m.name,
      fee: m.fee,
      duration: m.duration,
      discount: m.discount,
      status: m.membershipstatus?.name,
    }));

    const statusesList = await prisma.status.findMany({
      where: { type: "membership", deleted_at: null },
      select: { status_id: true, name: true },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      data: formattedData,
      statuses: statusesList,
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

export const getMembershipById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetMembershipId = parseInt(id);
    if (isNaN(targetMembershipId)) {
      return res.status(400).json({ message: "Invalid Membership ID" });
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
        accessrole: {
          name: STAMPS.VIEW_MEMBERSHIP,
        },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view memberships",
      });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        membership_id: targetMembershipId,
        deleted_at: null,
      },
      include: {
        membershipstatus: true,
      },
    });

    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const formattedData = {
      membership_id: membership.membership_id,
      name: membership.name,
      fee: membership.fee,
      duration: membership.duration,
      discount: membership.discount,
      status: membership.membershipstatus?.name,
    };

    return res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyMembership = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const membership = await prisma.user_membership.findUnique({
      where: { user_id: userId },
      include: {
        membershipuser: {
          include: {
            membershipstatus: true,
          },
        },
        branchuser: true,
      },
    });

    if (!membership) {
      return res.status(200).json({ data: null });
    }

    return res.status(200).json({
      data: {
        membership_id: membership.membership_id,
        name: membership.membershipuser?.name,
        fee: membership.membershipuser?.fee,
        duration: membership.membershipuser?.duration,
        discount: membership.membershipuser?.discount,
        status: membership.membershipuser?.membershipstatus?.name,
        branch: membership.branchuser?.name || null,
        start_date: membership.start_date,
        end_date: membership.end_date,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const allocateMembership = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { user_id, membership_id, branch_id } = req.body;

    if (!membership_id) {
      return res.status(400).json({ message: "Membership ID is required" });
    }

    if (!branch_id) {
      return res.status(400).json({ message: "Branch is required" });
    }

    const scope = await getStaffBranchScope(userId);

    if (!scope.isPrivileged && !scope.branchIds.includes(parseInt(branch_id))) {
      return res.status(403).json({
        message: "You can only allocate memberships to your own branch",
      });
    }

    const targetUserId = parseInt(user_id);

    const targetUser = await prisma.user.findFirst({
      where: { user_id: targetUserId, deleted_at: null },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const plan = await prisma.membership.findUnique({
      where: { membership_id: parseInt(membership_id), deleted_at: null },
    });

    if (!plan) {
      return res.status(404).json({ message: "Membership plan not found" });
    }

    const branch = await prisma.branch.findFirst({
      where: { branch_id: parseInt(branch_id), deleted_at: null },
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const startDate = new Date();
    const endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);

    const existing = await prisma.user_membership.findUnique({
      where: { user_id: targetUserId },
    });

    if (existing) {
      await prisma.user_membership.update({
        where: { user_id: targetUserId },
        data: {
          membership_id: plan.membership_id,
          branch_id: parseInt(branch_id),
          start_date: startDate,
          end_date: endDate,
        },
      });
    } else {
      await prisma.user_membership.create({
        data: {
          user_id: targetUserId,
          membership_id: plan.membership_id,
          branch_id: parseInt(branch_id),
          start_date: startDate,
          end_date: endDate,
        },
      });
    }

    await prisma.user_branch.deleteMany({
      where: { user_id: targetUserId },
    });

    await prisma.user_branch.create({
      data: {
        user_id: targetUserId,
        branch_id: parseInt(branch_id),
      },
    });

    const hasAnyRole = await prisma.user_role.findFirst({
      where: { user_id: targetUserId, deleted_at: null },
    });

    if (!hasAnyRole) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: DEFAULT_NEW_USER_ROLE, deleted_at: null },
      });

      if (defaultRole) {
        await prisma.user_role.create({
          data: {
            user_id: targetUserId,
            role_id: defaultRole.role_id,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Membership allocated successfully",
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAvailablePlans = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "fee";
    let order = req.query.order || "asc";

    const validSortFields = ["fee", "name", "duration", "created_at"];
    const validOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) sortBy = "fee";
    if (!validOrders.includes(order)) order = "asc";

    const where = { deleted_at: null };

    if (req.query.search) {
      where.name = { contains: req.query.search };
    }

    const plans = await prisma.membership.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
      select: {
        membership_id: true,
        name: true,
        fee: true,
        duration: true,
        discount: true,
      },
    });

    const totalCount = await prisma.membership.count({ where: where });

    return res.status(200).json({
      data: plans,
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