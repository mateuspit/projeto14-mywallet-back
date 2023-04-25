import Joi from "joi";

const loginValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const loginSchema = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2}).lowercase().required(),
    password: Joi.string().min(3).max(30).required(),
});

export const validateLogin = loginValidator(loginSchema);