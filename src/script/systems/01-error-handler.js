/* =========================================================================
   Error Handler: Standardized Error Handling
   
   Provides consistent error handling patterns across the application.
   All functions should use this module for error reporting.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Creates a standardized result object for operations
   * @param {boolean} ok - Whether the operation succeeded
   * @param {*} data - Result data (if ok) or error details (if not ok)
   * @param {string} message - Human-readable message
   * @returns {Object} Result object
   */
  function createResult(ok, data = null, message = "") {
    return {
      ok,
      data,
      message,
      timestamp: Date.now()
    };
  }

  /**
   * Creates a success result
   * @param {*} data - Result data
   * @param {string} message - Success message (optional)
   * @returns {Object} Success result object
   */
  function success(data = null, message = "") {
    return createResult(true, data, message);
  }

  /**
   * Creates an error result
   * @param {string} reason - Error reason/code
   * @param {string} message - Human-readable error message
   * @param {*} details - Additional error details (optional)
   * @returns {Object} Error result object
   */
  function error(reason, message, details = null) {
    return createResult(false, { reason, details }, message);
  }

  /**
   * Logs an error with context
   * @param {string} context - Context where error occurred (e.g., function name)
   * @param {Error|string} err - Error object or message
   * @param {Object} details - Additional context details
   */
  function logError(context, err, details = {}) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    console.warn(`[${context}] ${errorMessage}`, {
      ...details,
      stack: errorStack
    });
  }

  /**
   * Wraps a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context name for error logging
   * @returns {Function} Wrapped function
   */
  function wrapWithErrorHandling(fn, context) {
    return function (...args) {
      try {
        const result = fn.apply(this, args);
        // If result is a promise, catch errors
        if (result && typeof result.then === "function") {
          return result.catch(err => {
            logError(context, err, { args });
            return error("exception", err.message || "An error occurred");
          });
        }
        return result;
      } catch (err) {
        logError(context, err, { args });
        return error("exception", err.message || "An error occurred");
      }
    };
  }

  Skycore.Systems.ErrorHandler = {
    createResult,
    success,
    error,
    logError,
    wrapWithErrorHandling
  };
})();
