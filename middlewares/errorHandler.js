export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.error("❌ Error Logged:", {
    message: err.message,
    stack: err.stack,
  });

  // 2. Handle Mongoose Bad ObjectId (CastError)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // 3. Handle Custom AppError (Operational Errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // 4. Default Fallback (Unknown/Programmatic Errors)
  return res.status(500).json({
    success: false,
    message: "Something went very wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
