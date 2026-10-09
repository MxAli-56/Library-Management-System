import Joi from "joi";

export const createRoleSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Role name can't be empty",
      "string.pattern.base": "Role name can only contain alphabets and spaces",
      "string.min": "Role name must be at least 3 characters",
      "string.max": "Role name can't be longer than 50 characters",
      "any.required": "Role name is required",
    }),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[a-zA-Z\s]+$/)
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Role name can't be empty",
      "string.pattern.base": "Role name can only contain alphabets and spaces",
      "string.min": "Role name must be at least 3 characters",
      "string.max": "Role name can't be longer than 50 characters",
    }),
});