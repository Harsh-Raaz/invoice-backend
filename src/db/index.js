// src/db/index.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Note: mongoose v6+ no longer needs useCreateIndex/useFindAndModify
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Optional: helpful connection event logs
mongoose.connection.on("connected", () => {
  console.log("MongoDB event: connected");
});
mongoose.connection.on("error", (err) => {
  console.error("MongoDB event: error", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB event: disconnected");
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  return async () => {
    try {
      await mongoose.connection.close();
      console.log(`MongoDB connection closed through ${signal}`);
      process.exit(0);
    } catch (err) {
      console.error("Error during MongoDB graceful shutdown", err);
      process.exit(1);
    }
  };
};

process.on("SIGINT", gracefulShutdown("SIGINT")); // ctrl+c
process.on("SIGTERM", gracefulShutdown("SIGTERM")); // kill

export default connectDB;