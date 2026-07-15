import { Router } from "express";
import { chatIntegration } from "../controllers/integration.controller";
import { requireApiKey } from "../middleware/api-key.middleware";
import { validate } from "../middleware/validation.middleware";
import { universalChatSchema } from "../validation/chat.validation";

const router = Router();

// Endpoint for Headless AI Chat integration
// Protect using the API Key middleware instead of JWT authenticateToken
router.post(
  "/chat",
  requireApiKey,
  validate(universalChatSchema),
  chatIntegration
);

export default router;
