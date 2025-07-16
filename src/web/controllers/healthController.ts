import { Request, Response } from "express";

export class HealthController {
  public static getHealth(req: Request, res: Response): void {
    res.json({ status: "ok" });
  }
}
