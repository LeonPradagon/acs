import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { getProfile, updatePassword, updateProfile } from "../controllers/user.controller";

const router = Router();

// Routes start with /api/users
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/profile/password", authenticateToken, updatePassword);

export default router;
