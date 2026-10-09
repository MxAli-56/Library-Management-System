import prisma from "../config/db.js";
import ROLES from "../enum/staffEnum/Role.enum.js";

export const getStaffBranchScope = async (userId) => {
  const userRoles = await prisma.user_role.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { role_id: true },
  });

  if (userRoles.length === 0) {
    return { isPrivileged: false, branchIds: [] };
  }

  const roleIds = userRoles.map((ur) => ur.role_id);

  const isPrivileged =
    roleIds.includes(ROLES.OWNER) || roleIds.includes(ROLES.ADMIN);

  if (isPrivileged) {
    return { isPrivileged: true, branchIds: null };
  }

  const userBranches = await prisma.user_branch.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { branch_id: true },
  });

  const branchIds = userBranches.map((ub) => ub.branch_id);

  return { isPrivileged: false, branchIds };
};