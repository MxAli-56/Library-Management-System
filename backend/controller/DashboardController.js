import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";

export const getStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    if (userRoles.length === 0)
      return res.status(403).json({ message: "No roles assigned" });

    const roleIds = userRoles.map((ur) => ur.role_id);
    const hasAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: roleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_DASHBOARD_STATS },
      },
    });
    if (!hasAccess) return res.status(403).json({ message: "Access denied" });

    const pendingStatus = await prisma.status.findFirst({
      where: { name: "Pending", type: "book_request", deleted_at: null },
    });

    const [
      totalBooks,
      totalUsers,
      totalBranches,
      activeMemberships,
      activeBorrows,
      overdueBorrows,
      pendingRequests,
      revenueAgg,
      branchesList,
      recentBorrows,
      recentRequests,
    ] = await Promise.all([
      prisma.book.count({ where: { deleted_at: null } }),
      prisma.user.count({ where: { deleted_at: null } }),
      prisma.branch.count({ where: { deleted_at: null } }),
      prisma.user_membership.count({ where: { end_date: { gt: new Date() } } }),
      prisma.book_borrow.count({
        where: { return_date: null, deleted_at: null },
      }),
      prisma.book_borrow.count({
        where: {
          return_date: null,
          due_date: { lt: new Date() },
          deleted_at: null,
        },
      }),
      pendingStatus
        ? prisma.book_request.count({
            where: { status_id: pendingStatus.status_id, deleted_at: null },
          })
        : 0,
      prisma.book_borrow.aggregate({
        where: { deleted_at: null },
        _sum: { amount_paid: true },
      }),
      prisma.branch.findMany({
        where: { deleted_at: null },
        select: { branch_id: true, name: true },
      }),
      prisma.book_borrow.findMany({
        where: { deleted_at: null },
        take: 5,
        orderBy: { created_at: "desc" },
        include: { bookborrow: true, userbookborrow: true, branchborrow: true },
      }),
      prisma.book_request.findMany({
        where: { deleted_at: null },
        take: 5,
        orderBy: { created_at: "desc" },
        include: {
          userbookrequest: true,
          requeststatus: true,
          branchrequest: true,
        },
      }),
    ]);

    const branchWise = await Promise.all(
      branchesList.map(async (b) => {
        const [booksAgg, borrows, members] = await Promise.all([
          prisma.branch_stock.aggregate({
            where: { branch_id: b.branch_id, deleted_at: null },
            _sum: { quantity: true },
          }),
          prisma.book_borrow.count({
            where: {
              branch_id: b.branch_id,
              return_date: null,
              deleted_at: null,
            },
          }),
          prisma.user_membership.count({
            where: { branch_id: b.branch_id, end_date: { gt: new Date() } },
          }),
        ]);
        return {
          branch_id: b.branch_id,
          branch_name: b.name,
          books: booksAgg._sum.quantity || 0,
          borrows: borrows,
          members: members,
        };
      }),
    );

    return res.status(200).json({
      data: {
        global: {
          total_books: totalBooks,
          total_users: totalUsers,
          total_branches: totalBranches,
          active_memberships: activeMemberships,
          active_borrows: activeBorrows,
          overdue_borrows: overdueBorrows,
          pending_requests: pendingRequests,
          total_revenue: parseFloat(
            (revenueAgg._sum.amount_paid || 0).toString(),
          ).toFixed(2),
        },
        branch_wise: branchWise,
        recent_borrows: recentBorrows.map((r) => ({
          borrow_id: r.book_borrow_id,
          book_name: r.bookborrow?.name || null,
          user_name: r.userbookborrow?.name || null,
          branch_name: r.branchborrow?.name || null,
          created_at: r.created_at,
        })),
        recent_requests: recentRequests.map((r) => ({
          request_id: r.book_request_id,
          name: r.name,
          author: r.author,
          user_name: r.userbookrequest?.name || null,
          branch_name: r.branchrequest?.name || null,
          status: r.requeststatus?.name || "Pending",
          created_at: r.created_at,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};