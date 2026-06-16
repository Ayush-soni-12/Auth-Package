import jwt from "jsonwebtoken";
import { config } from "../config.js";

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
    return res.status(401).json({ message: "Token not found. Please log in or signup." });
  }

  const isBlacklisted = await config.cacheAdapter.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(403).json({ message: "Token has been revoked. Please log in again." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = await config.dbAdapter.getUserById(decoded.userId);

    if (!req.user) {
      return res.status(404).json({ message: "User not found." });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: `Not authorized. Token failed: ${err.message}` });
  }
};
