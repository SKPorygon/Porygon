import express from "express";
import { registerUser, loginUser } from "../controllers/authController"; // Importing logic from the controller
import { authenticate } from "../middlewares/AuthMiddleware";
import { Response } from "express";
import { MyUserRequest } from "../express";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/protected", authenticate, (req: MyUserRequest, res: Response) => {
  res.json({ message: `Hello, user ${req.userId}` });
});

export default router;
