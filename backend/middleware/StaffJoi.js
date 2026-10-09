import Joi from "joi";

export const createStaffSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[A-Za-z\s]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.empty": "Name can't be empty",
      "string.pattern.base": "Name must contain only alphabets",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name can't be longer than 50 characters",
    }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email can't be empty",
    "string.email": "Email must be valid",
  }),
  role_id: Joi.number().required().messages({
    "string.empty":
      "Role Id can't be null. Admin must give a particular role to the staff",
  }),
  branch_ids: Joi.array().items(Joi.number()).min(1).required().messages({
    "string.empty":
      "Branch Id can't be null. Admin must assign a branch to the staff member",
    "array.min": "At least one branch must be selected",
  }),
});

export const updateStaffSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[A-Za-z\s]+$/)
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Name can't be empty",
      "string.pattern.base": "Name must contain only alphabets",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name can't be longer than 50 characters",
    }),
  email: Joi.string().email().messages({
    "string.empty": "Email can't be empty",
    "string.email": "Email must be valid",
  }),
  role_id: Joi.number().messages({
    "number.base": "Role ID must be a number",
  }),
  role_ids: Joi.array().items(Joi.number()).messages({
    "array.base": "Role IDs must be an array of numbers",
  }),
  branch_ids: Joi.array().items(Joi.number()).messages({
    "array.base": "Branch IDs must be an array of numbers",
  }),
  membership_id: Joi.number().allow(null).messages({
    "number.base": "Membership ID must be a number",
  }),
});