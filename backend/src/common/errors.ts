/**
 * Custom Application Error Classes
 * Provides structured, consistent error handling across the application.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(403, message, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  public readonly details: any;

  constructor(message: string = "Validation failed", details?: any) {
    super(400, message, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(409, message, "CONFLICT");
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      502,
      message || `External service "${service}" is unavailable`,
      "EXTERNAL_SERVICE_ERROR",
    );
  }
}
