import { Router } from "express";
import {
  uploadPDF,
  getDocuments,
  getDocument,
  deleteDocument,
  uploadMiddleware,
} from "../controllers/documentController";

const router = Router();

// Upload PDF endpoint
router.post("/upload", uploadMiddleware, uploadPDF);

// Get all documents
router.get("/", getDocuments);

// Get specific document with chunks
router.get("/:id", getDocument);

// Delete document
router.delete("/:id", deleteDocument);

export default router;
