import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadDocuments } from "../controllers/document.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Configure Multer storage
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .pdf and .txt files are allowed"));
    }
  },
});

// Route for uploading documents
router.post(
  "/documents",
  authenticateToken,
  upload.array("files"),
  uploadDocuments,
);

export default router;
