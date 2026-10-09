import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "any.required": "Category name is required",
    "string.base": "Category name must be a string",
    "string.min": "Category name must be at least 2 characters",
    "string.max": "Category name must be at most 50 characters",
  }),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).messages({
    "string.base": "Category name must be a string",
    "string.min": "Category name must be at least 2 characters",
    "string.max": "Category name must be at most 50 characters",
  }),
});
