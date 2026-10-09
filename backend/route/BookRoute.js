import express from 'express';
import {createBook, getAllBooks, getBookById, updateBook, deleteBook, restoreBook, getAllCategories } from '../controller/BookController.js';
import authenticate from '../middleware/Auth.js';
import { requiredAccess } from '../middleware/Access.js';
import { uploadCover } from "../middleware/Upload.js";

const bookRoute = express.Router();

bookRoute.post('/create', authenticate, requiredAccess('view_create_book'), uploadCover, createBook);
bookRoute.patch('/update/:id', authenticate, requiredAccess('view_update_book'), uploadCover, updateBook);
bookRoute.delete('/delete/:id', authenticate, requiredAccess('view_delete_book'), deleteBook);
bookRoute.patch('/restore/:id', authenticate, requiredAccess('view_restore_book'), restoreBook);
bookRoute.get('/categories', authenticate, getAllCategories);
bookRoute.get('/getall', authenticate, getAllBooks);
bookRoute.get('/:id', authenticate, getBookById);

export default bookRoute;