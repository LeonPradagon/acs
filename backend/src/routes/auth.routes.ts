import { Router } from "express";
import {
  register,
  login,
  verifyToken,
  refreshToken,
  quickRefresh,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify", authenticateToken, verifyToken);
router.post("/refresh", refreshToken);
router.post("/quick-refresh", quickRefresh);

export default router;
