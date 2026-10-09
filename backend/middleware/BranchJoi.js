import Joi from "joi";

export const createBranchSchema = Joi.object({
    name: Joi.string()
        .pattern(/^[A-Za-z\s\.\-\'\,]+$/)
        .required()
        .min(3)
        .max(50)
        .messages({
            "string.empty": "Branch name can't be empty",
            "string.pattern.base": "Branch name can only contain alphabets, spaces, dots, hyphens, apostrophes, and commas",
            "string.min": "Branch name must be at least 3 characters",
            "string.max": "Branch name can't be longer than 50 characters",
            "any.required": "Branch name is required",
        }),
    location: Joi.string()
        .required()
        .min(3)
        .max(100)
        .messages({
            "string.empty": "Location can't be empty",
            "string.min": "Location must be at least 3 characters",
            "string.max": "Location can't be longer than 100 characters",
            "any.required": "Location is required",
        }),
});

export const updateBranchSchema = Joi.object({
    name: Joi.string()
        .pattern(/^[A-Za-z\s\.\-\'\,]+$/)
        .min(3)
        .max(50)
        .messages({
            "string.empty": "Branch name can't be empty",
            "string.pattern.base": "Branch name can only contain alphabets, spaces, dots, hyphens, apostrophes, and commas",
            "string.min": "Branch name must be at least 3 characters",
            "string.max": "Branch name can't be longer than 50 characters",
        }),
    location: Joi.string()
        .min(3)
        .max(100)
        .messages({
            "string.empty": "Location can't be empty",
            "string.min": "Location must be at least 3 characters",
            "string.max": "Location can't be longer than 100 characters",
        }),
});