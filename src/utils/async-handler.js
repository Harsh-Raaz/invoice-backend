// src/utils/async-handler.js

// Wraps async route handlers and passes errors to Express error middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export default asyncHandler;