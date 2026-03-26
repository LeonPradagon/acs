import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import {
  getUsers,
  updateUserRole,
  deleteUser,
  getAllDocuments,
  deleteDocument,
} from "../controllers/admin.controller";

const router = Router();

// Apply Global Security: Only valid JWTs with 'admin' role can access these routes
router.use(authenticateToken);
router.use(authorizeRole(["admin"]));

// User Management
router.get("/users", getUsers);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

// Document / Knowledge Base Management
router.get("/documents", getAllDocuments);
router.delete("/documents/:id", deleteDocument);

export default router;
