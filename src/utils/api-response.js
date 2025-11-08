// src/utils/api-response.js

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // true for 2xx/3xx, false for 4xx/5xx
  }
}

export default ApiResponse;