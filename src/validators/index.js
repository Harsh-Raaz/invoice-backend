// src/validators/index.js
import { body } from "express-validator";

/**
 * NOTE: these are basic validators to get you started.
 * You can add more checks (regex, length, custom) as needed.
 */

export const userRegisterValidator = () => [
  body("email").isEmail().withMessage("Valid email is required"),
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const userLoginValidator = () => [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const userForgotPasswordValidator = () => [
  body("email").isEmail().withMessage("Valid email is required"),
];

export const userResetForgotPasswordValidator = () => [
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// For authenticated change password
export const userChangeCurrentPasswordValidator = () => [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

/* Invoice validators */
export const invoiceCreateValidator = () => [
  body("customerName").notEmpty().withMessage("Customer name is required"),
  body("customerPhone").notEmpty().withMessage("Customer phone is required"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),
  body("items.*.name").notEmpty().withMessage("Item name is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Item quantity must be an integer >= 1"),
  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage("Item price must be a number >= 0"),
  // optional tax check
  body("tax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax must be a number >= 0"),
];

export default {
  userRegisterValidator,
  userLoginValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  userChangeCurrentPasswordValidator,
  invoiceCreateValidator,
};