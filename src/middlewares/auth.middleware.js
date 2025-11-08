// src/middlewares/auth.middleware.js
import { User } from "../models/user.model.js";
import ApiError from "../utils/api-error.js";
import asyncHandler from "../utils/async-handler.js";
import jwt from "jsonwebtoken";

/**
 * verifyJWT
 * - Looks for token in cookie `accessToken` or Authorization header "Bearer <token>"
 * - Verifies token and attaches `req.user` (without sensitive fields)
 * - Throws ApiError(401) on missing/invalid token
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.header("Authorization")?.startsWith("Bearer ")) {
    token = req.header("Authorization").replace("Bearer ", "");
  }

  if (!token) {
    throw new ApiError(401, "Invalid access token");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedToken || !decodedToken._id) {
      throw new ApiError(401, "Invalid access token");
    }

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    return next();
  } catch (error) {
    throw new ApiError(401, "Invalid access token");
  }
});

/**
 * authorizeRoles(...roles)
 * - Pass one or more role strings; 403 if user's role is not included
 */
export const authorizeRoles = (...allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Not authenticated");
    }

    const role = user.role;
    if (!role || !allowedRoles.includes(role)) {
      throw new ApiError(403, "Forbidden: insufficient permissions");
    }

    return next();
  });

export default { verifyJWT, authorizeRoles };