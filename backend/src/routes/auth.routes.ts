import { Router } from "express";
import {
  register,
  login,
  verifyToken,
  refreshToken,
  quickRefresh,
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validation/auth.validation";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/verify", authenticateToken, verifyToken);
router.post("/refresh", validate(refreshTokenSchema), refreshToken);
router.post("/quick-refresh", validate(refreshTokenSchema), quickRefresh);

export default router;
