import Joi from "joi";

const singUpValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const singUpSchema = Joi.object({
    username: Joi.string().pattern(new RegExp('^[a-zA-ZÀ-ú\\s]+$')).required(),
    email: Joi.string().email({ minDomainSegments: 2}).lowercase().required(),
    password: Joi.string().min(3).max(30).required(),
});

export const validateSignUp = singUpValidator(singUpSchema);