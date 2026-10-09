import express from 'express';
import {
    borrowBook,
    returnBook,
    getAllBorrows,
    getBorrowById,
    getMyActiveBorrow,
    getMyBorrows,
} from '../controller/BookBorrowController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';

const bookBorrowRoute = express.Router();

bookBorrowRoute.post('/create', authenticate, requiredAccess('view_borrow_book'), borrowBook);
bookBorrowRoute.patch('/return', authenticate, requiredAccess('view_borrow_book'), returnBook);
bookBorrowRoute.get('/getall', authenticate, requiredAccess('view_borrow'), getAllBorrows);
bookBorrowRoute.get("/my-active", authenticate, getMyActiveBorrow);
bookBorrowRoute.get("/my-borrows", authenticate, getMyBorrows);
bookBorrowRoute.get('/:id', authenticate, requiredAccess('view_borrow'), getBorrowById);

export default bookBorrowRoute;