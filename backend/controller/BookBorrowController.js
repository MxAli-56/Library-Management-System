import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import BORROW_STATUS from "../enum/staffEnum/BorrowStatus.enum.js";
import {
  createBorrowSchema,
  returnBorrowSchema,
} from "../middleware/BookBorrowJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";
import { DEFAULTS } from "../config/defaults.js";
import { getStaffBranchScope } from "../utils/branchFilter.js";

export const borrowBook = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_BORROW_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to borrow books",
      });
    }

    const { error } = createBorrowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { book_name, user_id, amount_paid_allocate } = req.body;
    const targetUserId = user_id || userId;

    const book = await prisma.book.findFirst({
      where: {
        name: { equals: book_name },
        deleted_at: null,
      },
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const scope = await getStaffBranchScope(userId);

    let targetBranchId = null;
    if (scope.isPrivileged) {
      targetBranchId = req.body.branch_id ? parseInt(req.body.branch_id) : null;
      if (!targetBranchId) {
        const userBranch = await prisma.user_branch.findFirst({
          where: { user_id: targetUserId, deleted_at: null },
        });
        targetBranchId = userBranch?.branch_id || null;
      }
    } else {
      if (scope.branchIds.length === 0) {
        return res.status(403).json({
          message: "You are not assigned to any branch",
        });
      }
      targetBranchId = scope.branchIds[0];
    }

    if (!targetBranchId) {
      return res.status(400).json({
        message: "Branch could not be determined",
      });
    }

    const stock = await prisma.branch_stock.findFirst({
      where: {
        book_id: book.book_id,
        branch_id: targetBranchId,
        deleted_at: null,
      },
    });

    if (!stock || stock.quantity <= 0) {
      return res.status(409).json({
        message: "Book is currently out of stock in this branch",
      });
    }

    const existingBorrow = await prisma.book_borrow.findFirst({
      where: {
        user_id: targetUserId,
        book_id: book.book_id,
        return_date: null,
        deleted_at: null,
      },
    });

    if (existingBorrow) {
      return res.status(409).json({
        message: "This user has already borrowed this book",
      });
    }

    const activeBorrow = await prisma.book_borrow.findFirst({
      where: {
        user_id: targetUserId,
        return_date: null,
        deleted_at: null,
      },
    });

    if (activeBorrow) {
      return res.status(409).json({
        message: "User already has an active borrow. Please return it first.",
      });
    }

    const membership = await prisma.user_membership.findUnique({
      where: { user_id: targetUserId },
      include: { membershipuser: true },
    });

    if (!membership) {
      return res.status(403).json({
        message: "User needs an active membership to borrow books",
      });
    }

    const borrowedStatus = await prisma.status.findFirst({
      where: {
        name: BORROW_STATUS.BORROWED,
        type: BORROW_STATUS.TYPE,
        deleted_at: null,
      },
    });

    if (!borrowedStatus) {
      return res.status(500).json({
        message: "Borrowed status not found in system",
      });
    }

    const expectedAllocate = parseFloat(
      (parseFloat(book.borrow_price) * 0.5).toFixed(2),
    );
    const providedAllocate = parseFloat(amount_paid_allocate || 0);

    if (Math.abs(providedAllocate - expectedAllocate) > 0.01) {
      return res.status(400).json({
        message: `Amount paid at allocation must be exactly 50% of borrow price (${expectedAllocate.toFixed(2)})`,
      });
    }

    const borrow = await prisma.book_borrow.create({
      data: {
        user_id: targetUserId,
        book_id: book.book_id,
        branch_id: targetBranchId,
        due_date: new Date(
          Date.now() + DEFAULTS.BORROW_DURATION_DAYS * 24 * 60 * 60 * 1000,
        ),
        status_id: borrowedStatus.status_id,
        amount_paid: expectedAllocate,
        amount_paid_allocate: expectedAllocate,
        amount_paid_return: 0,
      },
      include: {
        userbookborrow: true,
        bookborrow: true,
      },
    });

    const updatedStock = await prisma.branch_stock.update({
      where: { branch_stock_id: stock.branch_stock_id },
      data: {
        quantity: { decrement: 1 },
      },
    });

    return res.status(201).json({
      message: "Book borrowed successfully",
      data: {
        borrow_id: borrow.book_borrow_id,
        user_id: borrow.user_id,
        user_name: borrow.userbookborrow?.name,
        book_id: borrow.book_id,
        book_name: borrow.bookborrow?.name,
        quantity: updatedStock.quantity,
        borrow_date: borrow.borrow_date,
        due_date: borrow.due_date,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate borrow entry" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const returnBook = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_BORROW_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to return books",
      });
    }

    const { error } = returnBorrowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { book_name, user_id, amount_paid_return } = req.body;
    const targetUserId = user_id || userId;

    const book = await prisma.book.findFirst({
      where: {
        name: { equals: book_name },
        deleted_at: null,
      },
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const borrow = await prisma.book_borrow.findFirst({
      where: {
        user_id: targetUserId,
        book_id: book.book_id,
        return_date: null,
        deleted_at: null,
      },
      include: {
        bookborrow: true,
        userbookborrow: true,
      },
    });

    if (!borrow) {
      return res.status(404).json({
        message: "No active borrow record found for this user and book",
      });
    }

    const today = new Date();
    const dueDate = new Date(borrow.due_date);
    const daysLate = Math.max(
      0,
      Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)),
    );

    let fine = 0;

    if (daysLate > 0) {
      const finePerDay =
        parseFloat(borrow.bookborrow?.fine_per_day) ||
        DEFAULTS.DEFAULT_FINE_PER_DAY;
      fine = parseFloat((daysLate * finePerDay).toFixed(2));
    }

    const returnStatusName =
      daysLate > 0 ? BORROW_STATUS.LATE_RETURNED : BORROW_STATUS.RETURNED;

    const returnedStatus = await prisma.status.findFirst({
      where: {
        name: returnStatusName,
        type: BORROW_STATUS.TYPE,
        deleted_at: null,
      },
    });

    if (!returnedStatus) {
      return res.status(500).json({
        message: "Return status not found in system",
      });
    }

    const expectedReturn = parseFloat(
      (parseFloat(book.borrow_price) * 0.5).toFixed(2),
    );
    const providedReturn = parseFloat(amount_paid_return || 0);

    if (Math.abs(providedReturn - expectedReturn) > 0.01) {
      return res.status(400).json({
        message: `Amount paid at return must be exactly 50% of borrow price (${expectedReturn.toFixed(2)})`,
      });
    }

    const totalPaid = parseFloat(
      (
        parseFloat(borrow.amount_paid_allocate || 0) +
        expectedReturn +
        fine
      ).toFixed(2),
    );

    await prisma.book_borrow.update({
      where: { book_borrow_id: borrow.book_borrow_id },
      data: {
        return_date: today,
        status_id: returnedStatus.status_id,
        amount_paid: totalPaid,
        amount_paid_return: expectedReturn,
      },
    });

    if (daysLate > 0) {
      await prisma.late_return.create({
        data: {
          book_borrow_id: borrow.book_borrow_id,
          fine: fine,
          days_late: daysLate,
          status_id: returnedStatus.status_id,
        },
      });
    }

    if (borrow.branch_id) {
      await prisma.branch_stock.updateMany({
        where: {
          book_id: book.book_id,
          branch_id: borrow.branch_id,
          deleted_at: null,
        },
        data: {
          quantity: { increment: 1 },
        },
      });
    }

    return res.status(200).json({
      message:
        daysLate > 0
          ? `Book returned late. Fine: $${fine} for ${daysLate} days`
          : "Book returned successfully",
      data: {
        borrow_id: borrow.book_borrow_id,
        book_name: borrow.bookborrow?.name,
        borrowed_date: borrow.borrow_date,
        return_date: today,
        days_late: daysLate,
        fine: fine,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllBorrows = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_BORROW },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view borrows",
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sort_by = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";

    if (!SORTABLE_FIELDS.borrows.includes(sort_by)) {
      sort_by = "created_at";
    }
    if (!["asc", "desc"].includes(order)) {
      order = "desc";
    }

    const scope = await getStaffBranchScope(userId);

    const where = { deleted_at: null };

    if (!scope.isPrivileged) {
      where.branch_id = { in: scope.branchIds };
    }

    if (req.query.status && req.query.status !== "All") {
      if (req.query.status === "Overdue") {
        where.return_date = null;
        where.due_date = { lt: new Date() };
      } else {
        const statusRecord = await prisma.status.findFirst({
          where: {
            name: req.query.status,
            type: BORROW_STATUS.TYPE,
            deleted_at: null,
          },
        });
        if (statusRecord) {
          where.status_id = statusRecord.status_id;
        }
      }
    }

    if (req.query.search) {
      const isNumeric = /^\d+$/.test(req.query.search);
      const numSearch = parseFloat(req.query.search);

      where.OR = [
        { bookborrow: { name: { contains: req.query.search } } },
        { userbookborrow: { name: { contains: req.query.search } } },
        { userbookborrow: { email: { contains: req.query.search } } },
      ];

      if (isNumeric) {
        where.OR.push({ user_id: parseInt(req.query.search) });
        if (!isNaN(numSearch)) {
          where.OR.push({ amount_paid: { equals: numSearch } });
        }
      }
    }

    const borrows = await prisma.book_borrow.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sort_by]: order },
      include: {
        bookborrow: true,
        userbookborrow: true,
        borrowstatus: true,
        branchborrow: true,
      },
    });

    const totalCount = await prisma.book_borrow.count({ where: where });

    const today = new Date();

    const formattedData = borrows.map((b) => {
      const dueDate = new Date(b.due_date);

      let daysLate = 0;
      if (b.return_date) {
        const returnDate = new Date(b.return_date);
        daysLate = Math.max(
          0,
          Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)),
        );
      } else {
        daysLate = Math.max(
          0,
          Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)),
        );
      }

      const finePerDay =
        parseFloat(b.bookborrow?.fine_per_day) || DEFAULTS.DEFAULT_FINE_PER_DAY;
      const fine = parseFloat((daysLate * finePerDay).toFixed(2));

      const isOverdue = b.return_date === null && dueDate < today;

      return {
        borrow_id: b.book_borrow_id,
        user_id: b.user_id,
        user_name: b.userbookborrow?.name,
        user_email: b.userbookborrow?.email,
        book_id: b.book_id,
        book_name: b.bookborrow?.name,
        borrow_price: parseFloat(b.bookborrow?.borrow_price || 0),
        branch_id: b.branch_id,
        branch_name: b.branchborrow?.name || null,
        borrow_date: b.borrow_date,
        due_date: b.due_date,
        return_date: b.return_date,
        amount_paid: parseFloat(b.amount_paid || 0),
        amount_paid_allocate: parseFloat(b.amount_paid_allocate || 0),
        amount_paid_return: parseFloat(b.amount_paid_return || 0),
        fine: fine,
        days_late: daysLate,
        status: isOverdue ? "Overdue" : b.borrowstatus?.name || "Unknown",
      };
    });

    const statusesList = await prisma.status.findMany({
      where: { type: BORROW_STATUS.TYPE, deleted_at: null },
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

export const getBorrowById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const borrowId = parseInt(id);
    if (isNaN(borrowId)) {
      return res.status(400).json({ message: "Invalid Borrow ID" });
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
        accessrole: { name: STAMPS.VIEW_BORROW },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view borrows",
      });
    }

    const borrow = await prisma.book_borrow.findUnique({
      where: { book_borrow_id: borrowId, deleted_at: null },
      include: {
        bookborrow: true,
        userbookborrow: true,
        borrowstatus: true,
      },
    });

    if (!borrow) {
      return res.status(404).json({ message: "Borrow not found" });
    }

    const today = new Date();
    const dueDate = new Date(borrow.due_date);

    let daysLate = 0;
    if (borrow.return_date) {
      const returnDate = new Date(borrow.return_date);
      daysLate = Math.max(
        0,
        Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)),
      );
    } else {
      daysLate = Math.max(
        0,
        Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)),
      );
    }

    const finePerDay =
      parseFloat(borrow.bookborrow?.fine_per_day) ||
      DEFAULTS.DEFAULT_FINE_PER_DAY;
    const fine = parseFloat((daysLate * finePerDay).toFixed(2));

    const isOverdue = borrow.return_date === null && dueDate < today;

    const formattedData = {
      borrow_id: borrow.book_borrow_id,
      user_id: borrow.user_id,
      user_name: borrow.userbookborrow?.name,
      book_id: borrow.book_id,
      book_name: borrow.bookborrow?.name,
      borrow_date: borrow.borrow_date,
      due_date: borrow.due_date,
      return_date: borrow.return_date,
      amount_paid: parseFloat(borrow.amount_paid || 0),
      amount_paid_allocate: parseFloat(borrow.amount_paid_allocate || 0),
      amount_paid_return: parseFloat(borrow.amount_paid_return || 0),
      fine: fine,
      days_late: daysLate,
      status: isOverdue ? "Overdue" : borrow.borrowstatus?.name || "Unknown",
    };

    return res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyActiveBorrow = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const borrow = await prisma.book_borrow.findFirst({
      where: {
        user_id: userId,
        return_date: null,
        deleted_at: null,
      },
      include: {
        bookborrow: true,
      },
    });

    return res.status(200).json({
      hasActiveBorrow: !!borrow,
      data: borrow
        ? {
            borrow_id: borrow.book_borrow_id,
            book_id: borrow.book_id,
            book_name: borrow.bookborrow?.name,
            due_date: borrow.due_date,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyBorrows = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const borrows = await prisma.book_borrow.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      include: {
        bookborrow: true,
      },
    });

    const formattedData = borrows.map((b) => ({
      borrow_id: b.book_borrow_id,
      book_id: b.book_id,
      book_name: b.bookborrow?.name,
      author: b.bookborrow?.author,
      fine_per_day:
        parseFloat(b.bookborrow?.fine_per_day) || DEFAULTS.DEFAULT_FINE_PER_DAY,
      borrow_date: b.borrow_date,
      due_date: b.due_date,
      return_date: b.return_date,
      status: b.return_date ? "Returned" : "Active",
    }));

    return res.status(200).json({ data: formattedData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};