import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const generateCookie = (res, userId) => {
  const token = jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: "7d",
  });

  res.cookie("Token", token, {
    httpOnly: true,
    // If user passed a specific cookieSecure config use it, else default to NODE_ENV
    secure: config.cookieSecure !== undefined ? config.cookieSecure : process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};
