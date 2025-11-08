// src/controllers/healthcheck.controller.js
import mongoose from "mongoose";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const healthCheck = asyncHandler(async (req, res) => {
  // mongoose.connection.readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : "disconnected";
  return res
    .status(200)
    .json(
      new ApiResponse(200, { server: "ok", db: dbStatus }, "Health check OK")
    );
});

export { healthCheck };