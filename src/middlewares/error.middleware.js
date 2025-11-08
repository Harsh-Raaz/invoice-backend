// src/middlewares/error.middleware.js
import ApiError from "../utils/api-error.js";

const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors || [],
    });
  }

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Internal Server Error",
  });
};

export default errorMiddleware;