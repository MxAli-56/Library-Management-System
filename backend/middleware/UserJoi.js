import Joi from 'joi'

export const userSchema = Joi.object({
  name: Joi.string().pattern(/^[A-Za-z\s]+$/).min(3).max(50).required().messages({
    "string.empty": "Name can't be empty",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name can't be longer than 50 characters",
    "string.pattern.base": "Name must contain only alphabets"
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email can't be empty",
    "string.email": "Email must be valid",
  }),
  password: Joi.string().required().min(6).max(20).messages({
    "string.empty": "Password can't be empty",
    "string.min": "Password must be at least 6 characters",
    "string.max": "Password can't be longer than 20 characters",
  }),
});