import { Router } from "express";
import { authValidation } from "../middlewares/auth.middleware.js";
import { logout, signIn, signUp } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.post("/cadastro", signUp);
userRouter.post("/signIn", signIn);
userRouter.delete("/logout", authValidation, logout);

export default userRouter;