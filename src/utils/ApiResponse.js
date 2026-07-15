/**
 * Standardized success response wrapper.
 * Ensures every successful API response follows the same shape:
 * { success, statusCode, message, data, meta }
 */
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export default ApiResponse;
