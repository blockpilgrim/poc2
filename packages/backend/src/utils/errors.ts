/**
 * Custom error class for application-specific errors
 * Extends the built-in Error class with HTTP status codes
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory method for common error types
   */
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static badRequest(message = 'Bad request'): AppError {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}