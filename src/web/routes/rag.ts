import { Router } from "express";
import { queryRAG, getStats } from "../controllers/ragController";

const router = Router();

// RAG query endpoint
router.post("/query", queryRAG);

// Get statistics
router.get("/stats", getStats);

export default router;
