/**
 * Standardized API response helper.
 * Provides consistent success response format across all controllers.
 */
class ApiResponse {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {Object|null} data - Response data payload
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null && data !== undefined) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   * @param {Object} res - Express response object
   * @param {Array} items - Array of items
   * @param {Object} meta - Pagination metadata
   * @param {string} message - Success message
   */
  static paginated(res, items, meta, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        items,
        meta,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = ApiResponse;
