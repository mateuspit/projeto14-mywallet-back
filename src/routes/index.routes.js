import { Router } from "express";
import userRouter from "./user.routes.js";
import operationsRouter from "./operations.routes.js";

const router = Router();

router.use(userRouter);
router.use(operationsRouter);

export default router;
