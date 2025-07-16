import { Router } from "express";
import { Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ message: "Users route works!", users: [] });
});

router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ message: `User ${id} details`, id });
});

export default router;
