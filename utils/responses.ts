// Response helpers for consistent API responses
export function createSuccessResponse(message: string, data?: any) {
  return {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  message: string,
  error?: any,
  statusCode: number = 500
) {
  return {
    success: false,
    message,
    statusCode,
    ...(error && {
      error: error instanceof Error ? error.message : String(error),
      ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
    }),
    timestamp: new Date().toISOString(),
  };
}

// Predefined error responses
export const ErrorResponses = {
  notFound: (resource: string = "Resource") =>
    createErrorResponse(`${resource} not found.`, null, 404),

  alreadyExists: (resource: string = "Resource") =>
    createErrorResponse(`${resource} already exists.`, null, 409),

  unauthorized: (message: string = "Unauthorized access.") =>
    createErrorResponse(message, null, 401),

  badRequest: (message: string = "Bad request.") =>
    createErrorResponse(message, null, 400),

  serverError: (message: string = "Internal server error.", error?: any) =>
    createErrorResponse(message, error, 500),

  validationError: (message: string = "Validation failed.") =>
    createErrorResponse(message, null, 422),

  forbidden: (message: string = "Access forbidden.") =>
    createErrorResponse(message, null, 403),

  conflict: (message: string = "Conflict occurred.") =>
    createErrorResponse(message, null, 409),

  tooManyRequests: (message: string = "Too many requests.") =>
    createErrorResponse(message, null, 429),
};

// Success response shortcuts
export const SuccessResponses = {
  created: (message: string, data?: any) =>
    createSuccessResponse(message, data),

  updated: (message: string, data?: any) =>
    createSuccessResponse(message, data),

  deleted: (message: string = "Resource deleted successfully.") =>
    createSuccessResponse(message),

  retrieved: (message: string, data?: any) =>
    createSuccessResponse(message, data),
};
