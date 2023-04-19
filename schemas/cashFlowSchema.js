import Joi from "joi";

const cashFlowValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false, convert: false });

const cashFlowSchema = Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().required(),
    type: Joi.string().insensitive().valid('entrada', 'saida').lowercase().required(),
    token: Joi.string().required()
});

export const validateCashFlow = cashFlowValidator(cashFlowSchema);