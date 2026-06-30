import { verifyToken } from "../helpers/validateToken.js";

/**
 * Middleware to restrict access to specific roles.
 * Must be used AFTER the verifyToken middleware.
 * 
 * @param {...string} roles - The roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // Ensure the user exists on the request (set by verifyToken)
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated. User not found." });
    }

    // Check if the user's role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Access forbidden: You do not have the required permissions." 
      });
    }

    // User has the required role, proceed to the next middleware
    next();
  };
};
