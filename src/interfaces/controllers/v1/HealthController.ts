import { Request, Response, NextFunction } from "express";

export class HealthController {
  check(req: Request, res: Response, next: NextFunction): void {
    try {
      res.status(200).json({
        status: "ok",
        app: process.env.APP_NAME || "GPSHouse",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
