import prisma from "../config/db.js";
import STAMPS from "../enum/staffEnum/Stamp.enum.js";
import { createBookSchema, updateBookSchema } from "../middleware/BookJoi.js";
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

export const createBook = async (req, res) => {
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
        accessrole: { name: STAMPS.VIEW_CREATE_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to create books",
      });
    }

    const { error } = createBookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
        details: error.details,
      });
    }

    const scope = await getStaffBranchScope(userId);

    if (!scope.isPrivileged && scope.branchIds.length === 0) {
      return res.status(403).json({
        message: "You are not assigned to any branch",
      });
    }

    const name = req.body.name;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const total_price = parseFloat(req.body.total_price);
    const borrow_price = parseFloat(req.body.borrow_price);
    const quantity = parseInt(req.body.quantity);
    const category_id = parseInt(req.body.category_id);
    const fine_per_day = parseFloat(req.body.fine_per_day);
    const cover_image = req.file ? req.file.filename : null;

    let targetBranchId;

    if (scope.isPrivileged) {
      targetBranchId = parseInt(req.body.branch_id) || 1;
    } else {
      if (req.body.branch_id) {
        const requestedBranchId = parseInt(req.body.branch_id);
        if (!scope.branchIds.includes(requestedBranchId)) {
          return res.status(403).json({
            message: "You can only add books to your assigned branches",
          });
        }
        targetBranchId = requestedBranchId;
      } else {
        targetBranchId = scope.branchIds[0];
      }
    }

    const existingBook = await prisma.book.findFirst({
      where: { isbn: isbn },
    });

    if (existingBook) {
      const sameName =
        existingBook.name.trim().toLowerCase() === name.trim().toLowerCase();
      const sameAuthor =
        existingBook.author.trim().toLowerCase() ===
        author.trim().toLowerCase();

      if (!sameName || !sameAuthor) {
        return res.status(409).json({
          message:
            "This ISBN already belongs to another book. If you're adding stock to the existing book, use the same name and author.",
        });
      }

      const existingStock = await prisma.branch_stock.findFirst({
        where: {
          book_id: existingBook.book_id,
          branch_id: targetBranchId,
          deleted_at: null,
        },
      });

      if (existingStock) {
        return res.status(409).json({
          message: "Book with this ISBN already exists in this branch",
        });
      }

      const newStock = await prisma.branch_stock.create({
        data: {
          branch_id: targetBranchId,
          book_id: existingBook.book_id,
          quantity: quantity,
        },
      });

      return res.status(201).json({
        message: "Book stock added to your branch",
        data: {
          book_id: existingBook.book_id,
          name: existingBook.name,
          total_price: existingBook.total_price,
          borrow_price: existingBook.borrow_price,
          author: existingBook.author,
          isbn: existingBook.isbn,
          cover_image: existingBook.cover_image,
          quantity: newStock.quantity,
          created_at: existingBook.created_at,
        },
      });
    }

    const newBook = await prisma.book.create({
      data: {
        name: name,
        total_price: total_price,
        borrow_price: borrow_price,
        author: author,
        isbn: isbn,
        cover_image: cover_image,
        category_id: category_id,
        fine_per_day: fine_per_day,
        branchstock: {
          create: {
            branch_id: targetBranchId,
            quantity: quantity,
          },
        },
      },
      include: {
        branchstock: true,
      },
    });

    return res.status(201).json({
      message: "Book created successfully",
      data: {
        book_id: newBook.book_id,
        name: newBook.name,
        total_price: newBook.total_price,
        borrow_price: newBook.borrow_price,
        author: newBook.author,
        isbn: newBook.isbn,
        cover_image: newBook.cover_image,
        quantity: newBook.branchstock?.[0]?.quantity || 0,
        created_at: newBook.created_at,
      },
    });
  } catch (error) {
    if (req.file) {
      deleteCoverFile(req.file.filename);
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateBook = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBookId = parseInt(id);
    if (isNaN(targetBookId)) {
      return res.status(400).json({ message: "Invalid Book ID" });
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
        accessrole: { name: STAMPS.VIEW_UPDATE_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to update books",
      });
    }

    const { error } = updateBookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const existingBook = await prisma.book.findUnique({
      where: {
        book_id: targetBookId,
        deleted_at: null,
      },
    });

    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const scope = await getStaffBranchScope(userId);

    if (!scope.isPrivileged && scope.branchIds.length === 0) {
      return res.status(403).json({
        message: "You are not assigned to any branch",
      });
    }

    let targetBranchId = null;

    if (scope.isPrivileged) {
      targetBranchId = req.body.branch_id ? parseInt(req.body.branch_id) : null;
    } else {
      if (req.body.branch_id) {
        const requestedBranchId = parseInt(req.body.branch_id);
        if (!scope.branchIds.includes(requestedBranchId)) {
          return res.status(403).json({
            message: "You can only update books in your assigned branches",
          });
        }
        targetBranchId = requestedBranchId;
      } else {
        targetBranchId = scope.branchIds[0];
      }
    }

    if (req.body.isbn && req.body.isbn !== existingBook.isbn) {
      const isbnExists = await prisma.book.findFirst({
        where: {
          isbn: req.body.isbn,
          NOT: {
            book_id: targetBookId,
          },
        },
      });

      if (isbnExists) {
        return res
          .status(409)
          .json({ message: "Book with this ISBN already exists" });
      }
    }

    const newCoverImage = req.file
      ? req.file.filename
      : existingBook.cover_image;

    if (req.file && existingBook.cover_image) {
      deleteCoverFile(existingBook.cover_image);
    }

    const updatedBook = await prisma.book.update({
      where: { book_id: targetBookId },
      data: {
        name: req.body.name || existingBook.name,
        total_price:
          req.body.total_price !== undefined && req.body.total_price !== ""
            ? parseFloat(req.body.total_price)
            : existingBook.total_price,
        borrow_price:
          req.body.borrow_price !== undefined && req.body.borrow_price !== ""
            ? parseFloat(req.body.borrow_price)
            : existingBook.borrow_price,
        author: req.body.author || existingBook.author,
        isbn: req.body.isbn || existingBook.isbn,
        cover_image: newCoverImage,
        category_id:
          req.body.category_id !== undefined && req.body.category_id !== ""
            ? parseInt(req.body.category_id)
            : existingBook.category_id,
        fine_per_day:
          req.body.fine_per_day !== undefined && req.body.fine_per_day !== ""
            ? parseFloat(req.body.fine_per_day)
            : existingBook.fine_per_day,
      },
    });

    if (
      req.body.quantity !== undefined &&
      req.body.quantity !== "" &&
      targetBranchId
    ) {
      const newQuantity = parseInt(req.body.quantity);

      await prisma.branch_stock.upsert({
        where: {
          branch_id_book_id: {
            branch_id: targetBranchId,
            book_id: targetBookId,
          },
        },
        update: { quantity: newQuantity },
        create: {
          branch_id: targetBranchId,
          book_id: targetBookId,
          quantity: newQuantity,
        },
      });
    }

    const finalStock = targetBranchId
      ? await prisma.branch_stock.findFirst({
          where: {
            branch_id: targetBranchId,
            book_id: targetBookId,
            deleted_at: null,
          },
        })
      : null;

    return res.status(200).json({
      message: "Book updated successfully",
      data: {
        book_id: updatedBook.book_id,
        name: updatedBook.name,
        total_price: updatedBook.total_price,
        borrow_price: updatedBook.borrow_price,
        author: updatedBook.author,
        isbn: updatedBook.isbn,
        cover_image: updatedBook.cover_image,
        quantity: finalStock?.quantity || 0,
        updated_at: updatedBook.updated_at,
      },
    });
  } catch (error) {
    if (req.file) {
      deleteCoverFile(req.file.filename);
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Duplicate value" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBookId = parseInt(id);
    if (isNaN(targetBookId)) {
      return res.status(400).json({ message: "Invalid Book ID" });
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
        accessrole: { name: STAMPS.VIEW_DELETE_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to delete books",
      });
    }

    const targetBook = await prisma.book.findUnique({
      where: {
        book_id: targetBookId,
        deleted_at: null,
      },
    });

    if (!targetBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    const deletedBook = await prisma.book.update({
      where: { book_id: targetBookId },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully",
      data: {
        book_id: deletedBook.book_id,
        name: deletedBook.name,
        deleted_at: deletedBook.deleted_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const restoreBook = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBookId = parseInt(id);
    if (isNaN(targetBookId)) {
      return res.status(400).json({ message: "Invalid Book ID" });
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
        accessrole: { name: STAMPS.VIEW_RESTORE_BOOK },
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        message: "You don't have permission to restore books",
      });
    }

    const targetBook = await prisma.book.findUnique({
      where: {
        book_id: targetBookId,
        deleted_at: { not: null },
      },
    });

    if (!targetBook) {
      return res
        .status(404)
        .json({ message: "Book not found or already active" });
    }

    const restoredBook = await prisma.book.update({
      where: { book_id: targetBookId },
      data: {
        deleted_at: null,
      },
    });

    return res.status(200).json({
      message: "Book restored successfully",
      data: {
        book_id: restoredBook.book_id,
        name: restoredBook.name,
        restored_at: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllBooks = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const scope = await getStaffBranchScope(userId);

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let sortBy = req.query.sort_by || "created_at";
    let order = req.query.order || "desc";

    const validSortFields = SORTABLE_FIELDS.books;
    const validOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) sortBy = "created_at";
    if (!validOrders.includes(order)) order = "desc";

    const where = { deleted_at: null };

    let filterBranchId = null;
    if (scope.isPrivileged && req.query.branch_id) {
      filterBranchId = parseInt(req.query.branch_id);
    }

    if (!scope.isPrivileged) {
      where.branchstock = {
        some: {
          branch_id: { in: scope.branchIds },
          deleted_at: null,
        },
      };
    } else if (filterBranchId) {
      where.branchstock = {
        some: {
          branch_id: filterBranchId,
          deleted_at: null,
        },
      };
    }

    if (req.query.category) {
      where.category = { name: req.query.category };
    }

    if (req.query.search) {
      const searchNumber = parseFloat(req.query.search);
      const orConditions = [
        { name: { contains: req.query.search } },
        { author: { contains: req.query.search } },
        { isbn: { contains: req.query.search } },
      ];
      if (!isNaN(searchNumber)) {
        orConditions.push({ total_price: { equals: searchNumber } });
      }
      where.OR = orConditions;
    }

    const books = await prisma.book.findMany({
      where: where,
      take: limit,
      skip: offset,
      orderBy: { [sortBy]: order },
      include: {
        category: true,
        branchstock: {
          where: { deleted_at: null },
          include: {
            branchstock: true,
          },
        },
      },
    });

    const totalCount = await prisma.book.count({ where: where });

    const formattedData = books.map((b) => {
      const stocks = b.branchstock || [];
      let displayQuantity = 0;
      let branchStock = [];

      if (filterBranchId) {
        const relevant = stocks.filter((s) => s.branch_id === filterBranchId);
        displayQuantity = relevant.reduce((sum, s) => sum + s.quantity, 0);
        branchStock = relevant.map((s) => ({
          branch_id: s.branch_id,
          branch_name: s.branchstock?.name || null,
          quantity: s.quantity,
        }));
      } else if (scope.isPrivileged) {
        displayQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
        branchStock = stocks.map((s) => ({
          branch_id: s.branch_id,
          branch_name: s.branchstock?.name || null,
          quantity: s.quantity,
        }));
      } else {
        const relevant = stocks.filter((s) =>
          scope.branchIds.includes(s.branch_id),
        );
        displayQuantity = relevant.reduce((sum, s) => sum + s.quantity, 0);
        branchStock = relevant.map((s) => ({
          branch_id: s.branch_id,
          branch_name: s.branchstock?.name || null,
          quantity: s.quantity,
        }));
      }

      return {
        book_id: b.book_id,
        name: b.name,
        total_price: b.total_price,
        borrow_price: b.borrow_price,
        author: b.author,
        isbn: b.isbn,
        cover_image: b.cover_image,
        quantity: displayQuantity,
        branch_stock: branchStock,
        category: b.category?.name || null,
        fine_per_day: b.fine_per_day,
      };
    });

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

export const getBookById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const targetBookId = parseInt(id);
    if (isNaN(targetBookId)) {
      return res.status(400).json({ message: "Invalid Book ID" });
    }

    const scope = await getStaffBranchScope(userId);

    const book = await prisma.book.findUnique({
      where: { book_id: targetBookId, deleted_at: null },
      include: {
        category: true,
        branchstock: {
          where: { deleted_at: null },
          include: {
            branchstock: true,
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    let displayQuantity = 0;
    if (scope.isPrivileged) {
      displayQuantity = (book.branchstock || []).reduce(
        (sum, s) => sum + s.quantity,
        0,
      );
    } else {
      const relevant = (book.branchstock || []).filter((s) =>
        scope.branchIds.includes(s.branch_id),
      );
      displayQuantity = relevant.reduce((sum, s) => sum + s.quantity, 0);
    }

    const branchStock = (book.branchstock || [])
      .filter(
        (s) => scope.isPrivileged || scope.branchIds.includes(s.branch_id),
      )
      .map((s) => ({
        branch_id: s.branch_id,
        branch_name: s.branchstock?.name || null,
        quantity: s.quantity,
      }));

    const formattedData = {
      book_id: book.book_id,
      name: book.name,
      total_price: book.total_price,
      borrow_price: book.borrow_price,
      author: book.author,
      isbn: book.isbn,
      cover_image: book.cover_image,
      quantity: displayQuantity,
      branch_stock: branchStock,
      category: book.category?.name || null,
      fine_per_day: book.fine_per_day,
      created_at: book.created_at,
      updated_at: book.updated_at,
    };

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      select: { category_id: true, name: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ data: categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};