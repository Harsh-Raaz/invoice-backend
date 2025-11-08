import { User } from "../models/user.model.js";
import ApiResponse from "../utils/api-response.js";
import ApiError from "../utils/api-error.js";
import asyncHandler from "../utils/async-handler.js";
import {
  sendEmail,
  emailVerificationMailgenConst,
  forgotPasswordMailgenConst,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Helper function to validate password rules
 */
const isPasswordValid = (password) => {
  const minLength = 8;
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

  if (!password || password.length < minLength) return false;
  if (!specialCharRegex.test(password)) return false;

  return true;
};

/**
 * Generate access + refresh tokens for a user
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token"
    );
  }
};

/**
 * Register new user
 */
const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  // Check if password and confirmPassword match
  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  // Check password rules
  if (!isPasswordValid(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and contain at least one special character"
    );
  }

  // Check if user already exists
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  // Generate email verification token
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Send verification email
  if (sendEmail) {
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${unHashedToken}`;
    await sendEmail({
      to: user.email,
      subject: "Please verify your email",
      mailGenContent: emailVerificationMailgenConst(
        user.username,
        verificationUrl
      ),
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Verification mail has been sent to your email ID"
      )
    );
});

/**
 * Login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) throw new ApiError(400, "User does not exist");

  const isPasswordValidLogin = await user.isPasswordCorrect(password);
  if (!isPasswordValidLogin) throw new ApiError(400, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

/**
 * Logout
 */
const logoutUser = asyncHandler(async (req, res) => {
  if (req.user && req.user._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: "" } },
      { new: true }
    );
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

/**
 * Get current user
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

/**
 * Verify email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken)
    throw new ApiError(400, "Email verification token is missing");

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Token is invalid or expired");

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

/**
 * Resend verification email
 */
const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User does not exist");
  if (user.isEmailVerified)
    throw new ApiError(409, "Email is already verified");

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  if (sendEmail) {
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${unHashedToken}`;
    await sendEmail({
      to: user.email,
      subject: "Please verify your email",
      mailGenContent: emailVerificationMailgenConst(
        user.username,
        verificationUrl
      ),
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Verification email resent"));
});

/**
 * Forgot password request
 */
const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User does not exist");

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  console.log("Forgot password token (use in Postman):", unHashedToken);
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  if (sendEmail) {
    const forgotPasswordUrl = `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`;
    await sendEmail({
      to: user.email,
      subject: "Password reset request",
      mailGenContent: forgotPasswordMailgenConst(
        user.username,
        forgotPasswordUrl
      ),
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent to your email ID"
      )
    );
});

/**
 * Reset forgot password
 */
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  if (!isPasswordValid(newPassword)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and contain at least one special character"
    );
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Token is invalid or expired");

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

/**
 * Change current password
 */
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!isPasswordValid(newPassword)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and contain at least one special character"
    );
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordValidOld = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValidOld) throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

/**
 * Refresh access token
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized access");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id).select("+refreshToken");
    if (!user || incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Invalid or expired refresh token");

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

export {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword,
};