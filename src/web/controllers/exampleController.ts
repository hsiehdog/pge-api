import { Request, Response } from "express";
import { ExampleService } from "../../services/exampleService";

export class ExampleController {
  private static exampleService = new ExampleService();

  public static async getExample(req: Request, res: Response): Promise<void> {
    try {
      const result = await ExampleController.exampleService.getExampleMessage();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
