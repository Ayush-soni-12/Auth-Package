import bcryptjs from "bcryptjs";
import { generateCode } from "../helpers/generateCode.js";
import { generateCookie } from "../helpers/generateCookie.js";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import {
  LOGIN_OTP_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  RESEND_OTP_EMAIL_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
} from "../helpers/emailTemplate.js";
import crypto from "crypto";
import { verifyGoogleToken } from "../helpers/googleTokenHelper.js";
import { config } from "../config.js";

// Helper to remove password from returned user object
const sanitizeUser = (user) => {
  if (!user) return null;
  const sanitized = { ...user };
  delete sanitized.password;
  return sanitized;
};

export const signup = async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    if (!email || !username || !password || !confirmPassword) {
      throw new AppError("Fill all the fields", 400);
    }

    if (password !== confirmPassword) {
      throw new AppError("Password do not Match", 400);
    }

    const userExists = await config.dbAdapter.getUserByEmail(email);
    if (userExists) {
      throw new AppError("User already exists", 400);
    }

    const hashPassword = await bcryptjs.hash(password, 10);
    
    const newUser = await config.dbAdapter.createUser({
      username,
      email,
      password: hashPassword,
    });

    const verificationURL = `${req.protocol}://${req.get("host")}${req.baseUrl}/verifyEmail/${newUser._id}`;

    const msg = VERIFICATION_EMAIL_TEMPLATE.replace(
      "{username}",
      username
    ).replace("{verificationURL}", verificationURL);

    await config.emailAdapter.sendMail(email, "Verify your email", msg);

    return res
      .status(201)
      .json({ message: "User created successfully", user: sanitizeUser(newUser) });
  } catch (error) {
    next(error);
  }
};

// Verify Email Controller
export const verifyEmail = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res.redirect(
        `${config.frontendUrl}/email-verification-failed?error=Invalid verification link`
      );
    }

    const user = await config.dbAdapter.getUserById(id);
    if (!user) {
      throw new AppError("User does not exist", 400);
    }

    if (user.isVerified) {
      throw new AppError("User already verified", 400);
    }

    // Update user as verified
    await config.dbAdapter.updateUser(id, { isVerified: true });

    // Generate token and set cookie
    const token = generateCookie(res, user._id);

    return res.redirect(`${config.frontendUrl}/email-verified-success`);
  } catch (error) {
    return res.redirect(
      `${config.frontendUrl}/email-verification-failed?error=${encodeURIComponent(error.message)}`
    );
  }
};

export const login = async (req, res, next) => {
  if (req.cookies.Token) {
    return res.status(400).json({ message: "User already logged in" });
  }
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw new AppError("Invalid Credentials", 400);
    }
    const user = await config.dbAdapter.getUserByEmailWithPassword(email);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }

    if (!user.isVerified) {
      throw new AppError("Email is not verified", 400);
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials ", 400);
    }

    const otp = generateCode();
    await config.cacheAdapter.set(`otp:${user._id}`, otp, 300);
    const msg = LOGIN_OTP_EMAIL_TEMPLATE.replace("{otp}", otp);
    await config.emailAdapter.sendMail(email, "Login OTP", msg);

    return res.status(200).json({
      message: "OTP sent to your email",
      user: sanitizeUser(user),
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyLoginOtp = async (req, res, next) => {
  const { id } = req.params;
  const { otp } = req.body;
  try {
    if (!id || !otp) {
      throw new AppError("Invalid request", 400);
    }

    let user = await config.dbAdapter.getUserById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const isValid = await config.cacheAdapter.get(`otp:${user._id}`);
    if (!isValid) {
      throw new AppError("Otp expired ", 400);
    }
    if (isValid !== otp) {
      throw new AppError("Invalid Otp", 400);
    }
    const token = generateCookie(res, user._id);
    
    // Update lastlogin
    user = await config.dbAdapter.updateUser(id, { lastlogin: new Date() });
    
    await config.cacheAdapter.del(`otp:${user._id}`);

    return res.status(200).json({
      message: "Login successful",
      token, // Send token in response
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      throw new AppError("Invalid request", 400);
    }
    const user = await config.dbAdapter.getUserById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const otp = generateCode();
    await config.cacheAdapter.set(`otp:${user._id}`, otp, 300);
    const msg = RESEND_OTP_EMAIL_TEMPLATE.replace("{otp}", otp);
    await config.emailAdapter.sendMail(user.email, "Resend OTP", msg);
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      throw new AppError("Email is required ", 400);
    }
    const user = await config.dbAdapter.getUserByEmail(email);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    await config.cacheAdapter.set(`resetToken:${user._id}`, resetToken, 3600);
    const msg = PASSWORD_RESET_REQUEST_TEMPLATE.replace(
      "{resetURL}",
      `${config.frontendUrl}/resetPassword/${user._id}/${resetToken}`
    );
    await config.emailAdapter.sendMail(email, "Reset your password", msg);
    
    return res
      .status(200)
      .json({
        message: "Password reset link sent to your email",
        user: sanitizeUser(user),
        resetToken: resetToken,
      });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const { id, token } = req.params;
  const { password } = req.body;
  try {
    if (!id || !token || !password) {
      throw new AppError("Invalid request", 400);
    }
    const tokenFromRedis = await config.cacheAdapter.get(`resetToken:${id}`);
    if (!tokenFromRedis) {
      throw new AppError("Invalid or expired token", 400);
    }
    if (tokenFromRedis !== token) {
      throw new AppError("Invalid token", 400);
    }
    const user = await config.dbAdapter.getUserById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    
    const hashedPassword = await bcryptjs.hash(password, 10);
    await config.dbAdapter.updateUser(id, { password: hashedPassword });
    
    const msg = PASSWORD_RESET_SUCCESS_TEMPLATE;
    await config.emailAdapter.sendMail(user.email, "Password reset successful", msg);
    await config.cacheAdapter.del(`resetToken:${id}`);
    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  const token = req.cookies.Token;
  if (token) {
    try {
      const decoded = jwt.decode(token); // decode without verifying

      const expiresAt = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresAt > 0) {
        await config.cacheAdapter.set(`blacklist:${token}`, "blacklisted", expiresAt);
      }
    } catch (error) {
      next(error);
    }
  }

  res.clearCookie("Token", {
    httpOnly: true,
    secure: config.cookieSecure !== undefined ? config.cookieSecure : process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.status(200).json({ message: "Logout Successful" });
};

export const checkAuth = async (req, res) => {
  try {
    const user = await config.dbAdapter.getUserById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: sanitizeUser(user),
      isAuthenticated: true,
      cached: false
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body; // Google ID token from frontend

    if (!token) {
      throw new AppError("Token missing", 400);
    }

    const payload = await verifyGoogleToken(token);

    const {
      email,
      name,
      sub: googleId,
      email_verified,
    } = payload;

    if (!email_verified) {
      throw new AppError("Email not verified", 400);
    }

    let user = await config.dbAdapter.getUserByEmail(email);

    // 🆕 SIGNUP
    if (!user) {
      user = await config.dbAdapter.createUser({
        username: name,
        email,
        googleId,
        authProvider: "google",
        isVerified: true,
      });
    } else {
      // 🔁 LOGIN (existing user)
      if (user.authProvider === "local" && !user.googleId) {
        // Optional: link accounts
        user = await config.dbAdapter.updateUser(user._id, {
            googleId: googleId,
            authProvider: "google",
            isVerified: true,
            lastlogin: new Date()
        });
      } else {
          user = await config.dbAdapter.updateUser(user._id, { lastlogin: new Date() });
      }
    }

    generateCookie(res, user._id);

    return res.status(200).json({
      message: "Google authentication successful",
      user: sanitizeUser(user),
    });

  } catch (err) {
    next(err);
  }
};