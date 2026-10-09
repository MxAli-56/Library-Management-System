import Joi from "joi";

export const createAccessSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Access name can't be empty",
      "string.pattern.base":
        "Access name can only contain letters, numbers, and underscores",
      "string.min": "Access name must be at least 3 characters",
      "string.max": "Access name can't be longer than 50 characters",
      "any.required": "Access name is required",
    }),
  description: Joi.string().min(10).max(150).required().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description can't be longer than 150 characters",
    "any.required": "Description is required",
  }),
  unlock_roles: Joi.array().items(Joi.string()).messages({
    "array.base": "Unlock roles must be an array of strings",
  }),
});

export const updateAccessSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Access name can't be empty",
      "string.pattern.base":
        "Access name can only contain letters, numbers, and underscores",
      "string.min": "Access name must be at least 3 characters",
      "string.max": "Access name can't be longer than 50 characters",
    }),
  description: Joi.string().min(10).max(150).messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description can't be longer than 150 characters",
  }),
  unlock_roles: Joi.array().items(Joi.string()).messages({
    "array.base": "Unlock roles must be an array of strings",
  }),
});
