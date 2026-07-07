import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import { getAnalytics } from "../controllers/analytics.controller";
import {
  getUsers,
  updateUserRole,
  updateUserSecurity,
  deleteUser,
  getAllDocuments,
  deleteDocument,
  restoreDocument,
  getKnowledgeGraph,
  getSecurityLogs,
  getTraceLogs,
  getPrompts,
  savePrompt,
  activatePrompt,
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
router.post("/documents/:id/restore", restoreDocument);

// System Settings Management
router.get("/settings", getSystemSettings);
router.put("/settings", validate(updateSettingSchema), updateSystemSetting);
router.post("/settings/test-connection", validate(testConnectionSchema), testConnection);

// Prompt Manager
router.get("/prompts", getPrompts);
router.post("/prompts", savePrompt);
router.post("/prompts/:id/activate", activatePrompt);

// Security Logs
router.get("/security-logs", getSecurityLogs);
router.get("/trace-logs", getTraceLogs);

// Knowledge Graph
router.get("/knowledge-graph", getKnowledgeGraph);

// AI Brain Status
router.get("/ai-brain-status", getAiBrainStatus);

// Analytics
router.get("/analytics", getAnalytics);

export default router;
