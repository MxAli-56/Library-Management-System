import Joi from "joi";

export const createBookRequestSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Book name is required",
    "string.base": "Book name must be a string",
  }),
  author: Joi.string().required().messages({
    "any.required": "Author is required",
    "string.base": "Author must be a string",
  }),
  isbn: Joi.string().required().min(10).max(13).messages({
    "any.required": "ISBN is required",
    "string.min": "ISBN must be at least 10 characters",
    "string.max": "ISBN must be at most 13 characters",
  }),
});

export const approveRequestSchema = Joi.object({
  quantity: Joi.number().integer().positive().required(),
  fine_per_day: Joi.number().min(0).required(),
  total_price: Joi.number().min(0).required(),
  borrow_price: Joi.number().min(0).required(),
  category_id: Joi.number().integer().required(),
});

export const rejectRequestSchema = Joi.object({
  rejection_reason: Joi.string().max(255).optional().messages({
    "string.base": "Rejection reason must be a string",
    "string.max": "Rejection reason must be at most 255 characters",
  }),
});
