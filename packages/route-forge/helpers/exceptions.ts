export interface ValidationIssue {
  path: string;
  message: string;
}

class HttpError extends Error {
  readonly statusCode: number;
  cause?: unknown;

  constructor(message: string, statusCode: number, cause?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }
}

class NotFoundException extends HttpError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundException";
  }
}

class BadRequestException extends HttpError {
  constructor(message: string = "Bad Request") {
    super(message, 400);
    this.name = "BadRequestException";
  }
}

class UnauthorizedException extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedException";
  }
}

class InternalServerErrorException extends HttpError {
  constructor(message: string = "Internal Server Error") {
    super(message, 500);
    this.name = "InternalServerErrorException";
  }
}

class ValidateException extends HttpError {
  cause: ValidationIssue[];

  constructor(
    errors: ValidationIssue[],
    message: string = "Input validation error",
  ) {
    super(message, 400, errors);
    this.name = "ValidateException";
    this.cause = errors;
  }
}

class ForbiddenException extends HttpError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenException";
  }
}

export {
  HttpError,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  ValidateException,
  BadRequestException,
};
