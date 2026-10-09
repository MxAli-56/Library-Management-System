import Joi from "joi";

export const createBorrowSchema = Joi.object({
  book_name: Joi.string().required().messages({
    "any.required": "Book name is required",
    "string.base": "Book name must be a string",
  }),
  user_id: Joi.number().integer().positive().optional().messages({
    "number.positive": "User ID must be a positive number",
    "number.integer": "User ID must be an integer",
  }),
  amount_paid_allocate: Joi.number().min(0).optional(),
});

export const returnBorrowSchema = Joi.object({
  book_name: Joi.string().required().messages({
    "any.required": "Book name is required",
    "string.base": "Book name must be a string",
  }),
  user_id: Joi.number().integer().positive().optional().messages({
    "number.positive": "User ID must be a positive number",
    "number.integer": "User ID must be an integer",
  }),
  amount_paid_return: Joi.number().min(0).optional(),
});