// src/models/user.model.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // do not return by default
    },

    // tokens and verification
    refreshToken: {
      type: String,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },
    forgotPasswordToken: {
      type: String,
      select: false,
    },
    forgotPasswordExpiry: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: hash password if modified
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Instance method: compare plain password with hashed
 */
userSchema.methods.isPasswordCorrect = async function (plainPassword) {
  if (!this.password) return false; // if password not selected
  return bcrypt.compare(plainPassword, this.password);
};

/**
 * Instance method: generate access token (JWT)
 */
userSchema.methods.generateAccessToken = function () {
  // payload can be customized (here include _id and email)
  return jwt.sign(
    { _id: this._id, email: this.email, username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    }
  );
};

/**
 * Instance method: generate refresh token (JWT)
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

/**
 * Instance method: generate temporary token (for email verify / password reset)
 * Returns: { unHashedToken, hashedToken, tokenExpiry }
 */
userSchema.methods.generateTemporaryToken = function () {
  // create random token
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  // hash it to store in DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");
  // expiry (e.g., 30 minutes)
  const tokenExpiry =
    Date.now() +
    (parseInt(process.env.TEMP_TOKEN_EXPIRE_MS, 10) || 30 * 60 * 1000);

  return { unHashedToken, hashedToken, tokenExpiry };
};

export const User = mongoose.model("User", userSchema);
export default User;