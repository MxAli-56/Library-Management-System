import Joi from "joi";

export const createBookSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  author: Joi.string().min(3).max(50).required(),
  isbn: Joi.string().min(10).max(17).required(),
  total_price: Joi.number().min(0).required(),
  borrow_price: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(0).required(),
  category_id: Joi.number().integer().required(),
  fine_per_day: Joi.number().min(0).required(),
  branch_id: Joi.number().integer().positive(),
});

export const updateBookSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  author: Joi.string().min(3).max(50),
  isbn: Joi.string().min(10).max(17),
  total_price: Joi.number().min(0),
  borrow_price: Joi.number().min(0),
  quantity: Joi.number().integer().min(0),
  category_id: Joi.number().integer(),
  fine_per_day: Joi.number().min(0),
  branch_id: Joi.number().integer().positive(),
});