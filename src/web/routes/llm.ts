import { Router } from "express";
import { askQuestion } from "../controllers/llmController";

const router = Router();

router.post("/ask", askQuestion);

export default router;
