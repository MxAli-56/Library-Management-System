import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import {
  createBookRequestSchema,
  approveRequestSchema,
  rejectRequestSchema,
} from "../middleware/BookRequestJoi.js";
import { SORTABLE_FIELDS } from "../config/sortableFields.js";
import { getStaffBranchScope } from "../utils/branchFilter.js";
import fs from "fs";
import path from "path";

const deleteCoverFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(process.cwd(), "uploads", "covers", filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("Failed to delete cover file:", error);
    }
  }
};

export const createBookRequest = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_CREATE_REQUEST },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to request books",
      });
    }

    const { error } = createBookRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { name, author, isbn } = req.body;
    const cover_image = req.file ? req.file.filename : null;

    const userBranch = await prisma.user_branch.findFirst({
      where: { user_id: userId, deleted_at: null },
    });

    const branch_id = userBranch?.branch_id || null;

    const bookInLibrary = await prisma.book.findFirst({
      where: { isbn: isbn },
    });

    if (bookInLibrary) {
      const bookStockInMyBranch = await prisma.branch_stock.findFirst({
        where: {
          book_id: bookInLibrary.book_id,
          branch_id: branch_id,
          deleted_at: null,
        },
      });

      if (bookStockInMyBranch) {
        return res.status(409).json({
          message: "The book with this ISBN already exists in your branch",
        });
      }
    }

    const existingRequest = await prisma.book_request.findFirst({
      where: {
        user_id: userId,
        isbn: isbn,
      },
      include: {
        requeststatus: true,
      },
    });

    if (existingRequest) {
      if (existingRequest.deleted_at !== null) {
        const updated = await prisma.book_request.update({
          where: { book_request_id: existingRequest.book_request_id },
          data: {
            deleted_at: null,
            status_id: 5,
            name: name,
            author: author,
            cover_image: cover_image,
            branch_id: branch_id,
            updated_at: new Date(),
          },
          include: {
            userbookrequest: true,
          },
        });
        return res.status(201).json({
          message: "Request re-submitted successfully",
          data: {
            request_id: updated.book_request_id,
            name: updated.name,
            author: updated.author,
            isbn: updated.isbn,
            cover_image: updated.cover_image,
            user_id: updated.user_id,
            user_name: updated.userbookrequest?.name,
            status: "Pending",
            request_date: updated.request_date,
          },
        });
      }

      const statusName = existingRequest.requeststatus?.name;
      if (statusName === "Pending") {
        return res.status(409).json({
          message: "You already have a pending request for this book",
        });
      }
      if (statusName === "Approved") {
        return res.status(409).json({
          message: "This book request has already been approved",
        });
      }
      if (statusName === "Rejected") {
        const updated = await prisma.book_request.update({
          where: { book_request_id: existingRequest.book_request_id },
          data: {
            status_id: 5,
            name: name,
            author: author,
            cover_image: cover_image,
            branch_id: branch_id,
            updated_at: new Date(),
          },
          include: {
            userbookrequest: true,
          },
        });
        return res.status(201).json({
          message: "Request re-submitted successfully",
          data: {
            request_id: updated.book_request_id,
            name: updated.name,
            author: updated.author,
            isbn: updated.isbn,
            cover_image: updated.cover_image,
            user_id: updated.user_id,
            user_name: updated.userbookrequest?.name,
            status: "Pending",
            request_date: updated.request_date,
          },
        });
      }
    }

    const request = await prisma.book_request.create({
      data: {
        name: name,
        author: author,
        isbn: isbn,
        cover_image: cover_image,
        branch_id: branch_id,
        user_id: userId,
        status_id: 5,
      },
      include: {
        userbookrequest: true,
      },
    });

    return res.status(201).json({
      message: "Book request submitted successfully",
      data: {
        request_id: request.book_request_id,
        name: request.name,
        author: request.author,
        isbn: request.isbn,
        cover_image: request.cover_image,
        user_id: request.user_id,
        user_name: request.userbookrequest?.name,
        status: "Pending",
        request_date: request.request_date,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllRequests = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_REQUEST },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to view requests",
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const sort_by = req.query.sort_by || "created_at";
    const order = req.query.order || "desc";

    if (!SORTABLE_FIELDS.requests.includes(sort_by)) {
      return res.status(400).json({ message: "Invalid sort field" });
    }

    const scope = await getStaffBranchScope(userId);

    const where = { deleted_at: null };

    if (!scope.isPrivileged) {
      where.branch_id = { in: scope.branchIds };
    }

    if (req.query.status) {
      const statusRecord = await prisma.status.findFirst({
        where: {
          name: req.query.status,
          type: "book_request",
          deleted_at: null,
        },
      });
      if (statusRecord) {
        where.status_id = statusRecord.status_id;
      }
    }

    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search } },
        { author: { contains: req.query.search } },
        { isbn: { contains: req.query.search } },
        { userbookrequest: { name: { contains: req.query.search } } },
      ];
    }

    const requests = await prisma.book_request.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sort_by]: order },
      include: {
        userbookrequest: {
          include: {
            userrole: {
              where: { deleted_at: null },
              include: {
                roleuser: true,
              },
            },
            userbranch: {
              where: { deleted_at: null },
              include: {
                branchuser: true,
              },
            },
          },
        },
        requeststatus: true,
      },
    });

    const totalCount = await prisma.book_request.count({ where: where });

    const formattedData = requests.map((r) => {
      const userRoles = r.userbookrequest?.userrole || [];
      const roleNames = userRoles
        .map((ur) => ur.roleuser?.name)
        .filter(Boolean);
      const userRole = roleNames.length > 0 ? roleNames.join(", ") : "Member";

      const branchNames = (r.userbookrequest?.userbranch || [])
        .map((ub) => ub.branchuser?.name)
        .filter(Boolean);

      return {
        request_id: r.book_request_id,
        name: r.name,
        author: r.author,
        isbn: r.isbn,
        cover_image: r.cover_image || null,
        user_id: r.user_id,
        user_name: r.userbookrequest?.name,
        user_role: userRole,
        user_branches: branchNames,
        status: r.requeststatus?.name || "Pending",
        request_date: r.request_date,
        created_at: r.created_at,
        rejection_reason: r.rejection_reason,
      };
    });

    const statusesList = await prisma.status.findMany({
      where: { type: "book_request", deleted_at: null },
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

export const getRequestById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid Request ID" });
    }

    const currentUserRoles = await prisma.user_role.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { role_id: true },
    });
    const currentRoleIds = currentUserRoles.map((ur) => ur.role_id);

    const hasViewAccess = await prisma.role_access.findFirst({
      where: {
        role_id: { in: currentRoleIds },
        deleted_at: null,
        accessrole: { name: STAMPS.VIEW_REQUEST },
      },
    });

    const request = await prisma.book_request.findUnique({
      where: { book_request_id: requestId, deleted_at: null },
      include: {
        userbookrequest: true,
        requeststatus: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (!hasViewAccess && request.user_id !== userId) {
      return res.status(403).json({
        message: "You don't have permission to view this request",
      });
    }

    const formattedData = {
      request_id: request.book_request_id,
      name: request.name,
      author: request.author,
      isbn: request.isbn,
      cover_image: request.cover_image || null,
      user_id: request.user_id,
      user_name: request.userbookrequest?.name,
      status: request.requeststatus?.name || "Pending",
      request_date: request.request_date,
      created_at: request.created_at,
    };

    return res.status(200).json({
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const approveRequest = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_APPROVE_REQUEST },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to approve requests",
      });
    }

    const { error } = approveRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { id } = req.params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid Request ID" });
    }

    const quantity = parseInt(req.body.quantity);
    const fine_per_day = parseFloat(req.body.fine_per_day);
    const total_price = parseFloat(req.body.total_price);
    const borrow_price = parseFloat(req.body.borrow_price);
    const category_id = parseInt(req.body.category_id);

    const request = await prisma.book_request.findUnique({
      where: { book_request_id: requestId, deleted_at: null },
      include: {
        userbookrequest: true,
        requeststatus: true,
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const pendingStatus = await prisma.status.findFirst({
      where: {
        name: "Pending",
        type: "book_request",
        deleted_at: null,
      },
    });

    if (!pendingStatus || request.status_id !== pendingStatus.status_id) {
      return res.status(409).json({
        message: `Request status is ${request.requeststatus?.name || "unknown"}, cannot approve`,
      });
    }

    const bookExists = await prisma.book.findFirst({
      where: {
        isbn: request.isbn,
      },
    });

    if (bookExists) {
      return res.status(409).json({
        message: "Book with this ISBN already exists in the library",
      });
    }

    const staffUploadedImage = req.file ? req.file.filename : null;
    const finalCoverImage = staffUploadedImage || request.cover_image || null;

    if (!finalCoverImage) {
      return res.status(400).json({
        message:
          "Cover image is required to approve. Either the user must provide one with the request, or you must upload one now.",
      });
    }

    const approvedStatus = await prisma.status.findFirst({
      where: {
        name: "Approved",
        type: "book_request",
        deleted_at: null,
      },
    });

    if (!approvedStatus) {
      return res.status(500).json({
        message: "Approved status not found in system",
      });
    }

    try {
      await prisma.book_request.update({
        where: { book_request_id: requestId },
        data: {
          status_id: approvedStatus.status_id,
        },
      });

      const newBook = await prisma.book.create({
        data: {
          name: request.name,
          author: request.author,
          isbn: request.isbn,
          cover_image: finalCoverImage,
          total_price: total_price || 0,
          borrow_price: borrow_price || 0,
          fine_per_day: fine_per_day || 0.5,
          category_id: category_id,
        },
      });

      const requestScope = await getStaffBranchScope(userId);

      const approvalBranchId = request.branch_id
        ? request.branch_id
        : requestScope.isPrivileged
          ? 1
          : requestScope.branchIds[0];

      await prisma.branch_stock.create({
        data: {
          branch_id: approvalBranchId,
          book_id: newBook.book_id,
          quantity: quantity || 1,
        },
      });

      if (staffUploadedImage && request.cover_image) {
        deleteCoverFile(request.cover_image);
      }

      return res.status(200).json({
        message: "Request approved and book added to library",
        data: {
          request_id: request.book_request_id,
          book_id: newBook.book_id,
          name: newBook.name,
          author: newBook.author,
          isbn: newBook.isbn,
          cover_image: newBook.cover_image,
          total_price: newBook.total_price,
          borrow_price: newBook.borrow_price,
        },
      });
    } catch (innerError) {
      if (req.file) {
        deleteCoverFile(req.file.filename);
      }
      if (innerError.code === "P2002") {
        return res.status(409).json({ message: "Duplicate book entry" });
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

export const rejectRequest = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_REJECT_REQUEST },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to reject requests",
      });
    }

    const { error } = rejectRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const { id } = req.params;
    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid Request ID" });
    }

    const { rejection_reason } = req.body;

    const request = await prisma.book_request.findUnique({
      where: { book_request_id: requestId, deleted_at: null },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const rejectedStatus = await prisma.status.findFirst({
      where: {
        name: "Rejected",
        type: "book_request",
        deleted_at: null,
      },
    });

    if (!rejectedStatus) {
      return res.status(500).json({
        message: "Rejected status not found in system",
      });
    }

    try {
      await prisma.book_request.update({
        where: { book_request_id: requestId },
        data: {
          status_id: rejectedStatus.status_id,
          rejection_reason: rejection_reason || null,
        },
      });

      return res.status(200).json({
        message: "Request rejected successfully",
      });
    } catch (innerError) {
      if (innerError.code === "P2002") {
        return res.status(409).json({ message: "Duplicate request entry" });
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

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await prisma.book_request.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      include: {
        requeststatus: true,
      },
    });

    const formattedData = requests.map((r) => ({
      request_id: r.book_request_id,
      name: r.name,
      author: r.author,
      isbn: r.isbn,
      cover_image: r.cover_image || null,
      branch_id: r.branch_id,
      status: r.requeststatus?.name || "Pending",
      request_date: r.request_date,
      rejection_reason: r.rejection_reason || null,
    }));

    return res.status(200).json({ data: formattedData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};