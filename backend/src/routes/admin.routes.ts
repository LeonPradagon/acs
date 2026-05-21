import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  getUsers,
  updateUserRole,
  updateUserSecurity,
  deleteUser,
  getAllDocuments,
  deleteDocument,
  getSystemSettings,
  updateSystemSetting,
  testConnection,
  getAiBrainStatus,
} from "../controllers/admin.controller";
import {
  updateUserRoleSchema,
  updateUserSecuritySchema,
  updateSettingSchema,
  testConnectionSchema,
} from "../validation/admin.validation";

const router = Router();

// Apply Global Security: Only valid JWTs with admin/superadmin role can access these routes
router.use(authenticateToken);
router.use(authorizeRole(["superadmin", "admin"]));

// User Management
router.get("/users", getUsers);
router.put("/users/:id/role", validate(updateUserRoleSchema), updateUserRole);
router.put("/users/:id/security", validate(updateUserSecuritySchema), updateUserSecurity);
router.delete("/users/:id", deleteUser);

// Document / Knowledge Base Management
router.get("/documents", getAllDocuments);
router.delete("/documents/:id", deleteDocument);

// System Settings Management
router.get("/settings", getSystemSettings);
router.put("/settings", validate(updateSettingSchema), updateSystemSetting);
router.post("/settings/test-connection", validate(testConnectionSchema), testConnection);

// AI Brain Status
router.get("/ai-brain-status", getAiBrainStatus);

export default router;
