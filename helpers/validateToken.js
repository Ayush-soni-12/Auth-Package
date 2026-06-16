import jwt from "jsonwebtoken";
import User from "../modals/User.js";
import client from "../utils/redisClient.js";

export const verifyToken = async (req, res, next) => {
  let token = req.cookies.Token;

  // Check for token in Authorization header if not in cookies
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new Error("Token not found . Please log in or signup");
  }

  const isBlacklisted = await client.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(403).send("Token has been revoked. Please log in again.");
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.userId).select("-password");

    if (!req.user) {
      res.status(404);
      throw new Error("User not found.");
    }

    next();
  } catch (err) {
    res.status(401);
    throw new Error(`Not authorized. Token failed: ${err.message}`);
    // next(err)
  }
};
