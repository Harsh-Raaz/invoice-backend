// src/middlewares/validator.middleware.js
import { validationResult } from "express-validator";
import ApiError from "../utils/api-error.js";

/**
 * validate middleware
 * use like: router.post("/register", userRegisterValidator(), validate, registerUser)
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Map errors into array of { field, message }
  const extractedErrors = errors.array().map((err) => ({
    field: err.param,
    message: err.msg,
  }));
  console.log("Validation errors:", extractedErrors);


  // Throw ApiError using your project's error shape
  throw new ApiError(400, "Validation failed", extractedErrors);
};

export default validate;