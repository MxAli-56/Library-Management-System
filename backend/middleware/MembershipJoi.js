import joi from "joi";

export const createMembershipSchema = joi.object({
  name: joi
    .string()
    .pattern(/^[A-Za-z\s\.\-\'\,\_]+$/)
    .required()
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Name can't be empty",
      "string.min": "Name must be at least 3 characters",
      "string.max": "Name can't be longer than 50 characters",
      "any.required": "Name is required",
      "string.pattern.base":
        "Membership Name can contain only alphabets, spaces, dots, hyphens, apostrophes, and commas",
    }),

  fee: joi.number().precision(2).positive().required().messages({
    "number.empty": "Fee can't be empty",
    "number.base": "Fee must be a number",
    "number.positive": "Fee must be greater than 0",
    "any.required": "Fee is required",
  }),

  duration: joi.number().integer().positive().required().messages({
    "number.empty": "Duration can't be empty",
    "number.base": "Duration must be an integer",
    "number.positive": "Duration must be greater than 0",
    "any.required": "Duration is required",
  }),

  discount: joi.number().precision(2).required().messages({
    "number.empty": "Discount can't be empty",
    "number.base": "Discount must be a number",
    "any.required": "Discount is required",
  }),

  status_id: joi.number().integer().positive().required().messages({
    "number.empty": "Status ID can't be empty",
    "number.base": "Status ID must be an integer",
    "number.positive": "Status ID must be greater than 0",
    "any.required": "Status ID is required",
  }),
});

export const updateMembershipSchema = joi.object({
  name: joi
    .string()
    .pattern(/^[A-Za-z\s\.\-\'\,\_]+$/)
    .min(3)
    .max(50)
    .messages({
      "string.empty": "Name can't be empty",
      "string.min": "Name must be at least 3 characters",
      "string.max": "Name can't be longer than 50 characters",
      "string.pattern.base":
        "Membership Name can contain only alphabets, spaces, dots, hyphens, apostrophes, and commas",
    }),

  fee: joi.number().precision(2).positive().messages({
    "number.empty": "Fee can't be empty",
    "number.base": "Fee must be a number",
    "number.positive": "Fee must be greater than 0",
  }),

  duration: joi.number().integer().positive().messages({
    "number.empty": "Duration can't be empty",
    "number.base": "Duration must be an integer",
    "number.positive": "Duration must be greater than 0",
  }),

  discount: joi.number().precision(2).messages({
    "number.empty": "Discount can't be empty",
    "number.base": "Discount must be a number",
  }),

  status_id: joi.number().integer().positive().messages({
    "number.empty": "Status ID can't be empty",
    "number.base": "Status ID must be an integer",
    "number.positive": "Status ID must be greater than 0",
  }),
});

export const buyMembershipSchema = joi.object({
  user_id: joi.number().integer().positive().optional(),
  membership_id: joi.number().integer().positive().required(),
});