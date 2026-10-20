import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";
import { logger } from "../configs/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on("finish", () => {
    const end = performance.now();
    const executionTime = (end - start).toFixed(3);

    logger.info(
      `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Execution Time: ${executionTime}ms`,
    );
  });

  next();
}
