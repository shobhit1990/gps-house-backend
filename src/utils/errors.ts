import { FormError } from "../domain/dto/FormError";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly innerException: any;
  public readonly isOperational: boolean;
  public readonly errors: Array<FormError> = [];

  constructor(
    message: string,
    statusCode: number = 500,
    innerException: any = null,
    errors: Array<FormError> = [],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    this.innerException = innerException;

    Error.captureStackTrace(this, this.constructor);
  }
}
