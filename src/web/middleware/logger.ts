import { Request, Response, NextFunction } from "express";

export const logger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Log the incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${
        res.statusCode
      } (${duration}ms)`
    );
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};
