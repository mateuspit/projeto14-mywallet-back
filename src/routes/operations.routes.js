import { chanceOperation, deleteOperation, getOperations, operation } from "../controllers/operations.controller.js";
import { Router } from "express";
import { authValidation } from "../middlewares/auth.middleware.js";

const operationsRouter = Router();

operationsRouter.use(authValidation);
operationsRouter.post("/nova-transacao/:tipo", operation);
operationsRouter.get("/transacoes", getOperations);
operationsRouter.delete("/delete", deleteOperation);
operationsRouter.put("/editar-registro/:tipo", chanceOperation);

export default operationsRouter;