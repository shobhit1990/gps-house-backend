import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../configs/logger";
import { FormError } from "../domain/dto/FormError";

export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "An unexpected error occurred";
  const errors = err instanceof AppError ? err.errors : new Array<FormError>();

  if (err instanceof AppError) {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    const response: Record<string, unknown> = {
      message: err.message,
    };

    if (errors?.length > 0) {
      response.errors = errors;
    }

    res.status(statusCode).json(response);
  } else {
    logger.error({
      message: "Unexpected Error",
      error: message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}
