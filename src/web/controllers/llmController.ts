import { Request, Response } from "express";
import { llmService } from "../../services/llmService";

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await llmService.processQuestion(question);
    res.json(result);
  } catch (error) {
    console.error("LLM Error:", error);
    res.status(500).json({ error: "Failed to process question" });
  }
};
