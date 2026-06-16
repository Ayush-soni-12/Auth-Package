import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import controlPlane from "./utils/neuralControl.js";
dotenv.config({ quiet: true });

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("connected to mongodb");
}
main().catch((err) => {
  console.log("error connecting to mongodb", err);
});

//Routes

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);
  try {
    await controlPlane.initialize([
      "/api/auth/check-auth",
      "/api/auth/signup",
      "/api/auth/verifyEmail",
      "/api/auth/login",
      "/api/auth/verifyLoginOtp",
      "/api/auth/resendOtp",
      "/api/auth/forgotPassword",
      "/api/auth/resetPassword",
      "/api/auth/logout",
      "/api/auth/google",
    ]);
    console.log("NeuralControl SDK initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize NeuralControl SDK:", err);
  }
});
