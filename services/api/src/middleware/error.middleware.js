/**
 * Global Error Handling Middleware
 * TICKET #005: Secure error handling with PHI protection
 * TICKET #016: Centralized error handling integration
 */

import Handler from "../exceptions/Handler.js";
import { AppError } from "../utils/errorHandler.js";

/**
 * Global error handling middleware for Fastify
 * Works with both old-style errors and new AppError classes
 *
 * @param {Error} error
 * @param {Object} request
 * @param {Object} reply
 */
const errorHandler = (error, request, reply) => {
  // If it's one of our custom AppError instances, set the statusCode
  if (error instanceof AppError) {
    error.statusCode = error.statusCode || 500;
    error.status = error.statusCode;
  }

  // Use our exception handler to render the error (includes PHI redaction)
  Handler.render(request, reply, error);
};

export default errorHandler;
