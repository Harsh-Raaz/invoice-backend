// src/routes/auth.routes.js
import { Router } from "express";
import {
  registerUser,
  login,
  logoutUser,
  verifyEmail,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  getCurrentUser,
  changeCurrentPassword,
  resendEmailVerification,
} from "../controllers/auth.controller.js";

import { validate } from "../middlewares/validator.middleware.js";
import {
  userRegisterValidator,
  userLoginValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  userChangeCurrentPasswordValidator,
} from "../validators/index.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* ========= UNSECURED ROUTES ========= */

// Register new user
// Make sure userRegisterValidator checks that 'confirmPassword' exists
router.post("/register", userRegisterValidator(), validate, registerUser);

// Login user
router.post("/login", userLoginValidator(), validate, login);

// Verify email
router.get("/verify-email/:verificationToken", verifyEmail);

// Refresh access token
router.post("/refresh-token", refreshAccessToken);

// Forgot password request
router.post(
  "/forgot-password",
  userForgotPasswordValidator(),
  validate,
  forgotPasswordRequest
);

// Reset password using reset token
router.post(
  "/reset-password/:resetToken",
  userResetForgotPasswordValidator(),
  validate,
  resetForgotPassword
);

/* ========= SECURED ROUTES (require JWT) ========= */

// Logout
router.post("/logout", verifyJWT, logoutUser);

// Get current logged-in user
router.get("/me", verifyJWT, getCurrentUser);
router.get("/current-user", verifyJWT, getCurrentUser); // alias

// Change current password
router.post(
  "/change-password",
  verifyJWT,
  userChangeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword
);

// Resend email verification
router.post("/resend-email-verification", verifyJWT, resendEmailVerification);

export default router;