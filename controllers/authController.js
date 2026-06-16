import User from "../modals/User.js";
import bcryptjs from "bcryptjs";
import { generateCode } from "../helpers/generateCode.js";
import client from "../utils/redisClient.js";
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
import { sendMail } from "../helpers/nodeMailer.js";
import crypto from "crypto";
import { verifyGoogleToken } from "../helpers/googleTokenHelper.js";

export const signup = async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    if (!email || !username || !password || !confirmPassword) {
      throw new AppError("Fill all the fields", 400);
    }

    if (password !== confirmPassword) {
      throw new AppError("Password do not Match", 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError("User already exists", 400);
    }

    const hashPassword = await bcryptjs.hash(password, 10);
    // const verificationCode = generateCode();
    const newUser = new User({
      username,
      email,
      password: hashPassword,
    });
    // await client.set(`verificationCode:${email}`,verificationCode,"Ex",3600)

    // generateCookie(res,newUser._id)

    const msg = VERIFICATION_EMAIL_TEMPLATE.replace(
      "{username}",
      username
    ).replace("{newUser._id}", newUser._id);

    await sendMail(email, "Verify your email", msg);

    await newUser.save();
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res
      .status(201)
      .json({ message: "User created successfully", user: userResponse });
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
        `${process.env.FRONT_URL}/email-verification-failed?error=Invalid verification link`
      );
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User does not exist", 400);
    }

    if (user.isVerified) {
      throw new AppError("User already verified", 400);
    }

    // Update user as verified
    user.isVerified = true;
    await user.save();

    // Generate token and set cookie
    const token = generateCookie(res, user._id);

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.redirect(`${process.env.FRONT_URL}/email-verified-success`);
  } catch (error) {
    return res.redirect(
      `${
        process.env.FRONT_URL
      }/email-verification-failed?error=${encodeURIComponent(error.message)}`
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
    const user = await User.findOne({ email }).select("+password");
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
    await client.set(`otp:${user._id}`, otp, "Ex", 300);
    const msg = LOGIN_OTP_EMAIL_TEMPLATE.replace("{otp}", otp);
    await sendMail(email, "Login OTP", msg);

    const userResponse = user.toObject();
    delete userResponse.password;

    // generateCookie(res,user._id)
    return res.status(200).json({
      message: "OTP sent to your email",
      user: userResponse,
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }login
};

export const verifyLoginOtp = async (req, res, next) => {
  const { id } = req.params;
  const { otp } = req.body;
  try {
    if (!id || !otp) {
      throw new AppError("Invalid request", 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const isValid = await client.get(`otp:${user._id}`);
    if (!isValid) {
      throw new AppError("Otp expired ", 400);
    }
    if (isValid !== otp) {
      throw new AppError("Invalid Otp", 400);
    }
    const token = generateCookie(res, user._id);
    user.lastlogin = new Date();
    await user.save();
    await client.del(`otp:${user._id}`);

    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(200).json({
      message: "Login successful",
      token, // Send token in response
      user: userResponse,
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
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const otp = generateCode();
    await client.set(`otp:${user._id}`, otp, "Ex", 300);
    const msg = RESEND_OTP_EMAIL_TEMPLATE.replace("{otp}", otp);
    await sendMail(user.email, "Resend OTP", msg);
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
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    await client.set(`resetToken:${user._id}`, resetToken, "Ex", 3600);
    const msg = PASSWORD_RESET_REQUEST_TEMPLATE.replace(
      "{resetURL}",
      `${process.env.FRONT_URL}/resetPassword`
    );
    await sendMail(email, "Reset your password", msg);
    const userResponse = user.toObject();
    delete userResponse.password;
    return res
      .status(200)
      .json({
        message: "Password reset link sent to your email",
        user: userResponse,
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
    const tokenFromRedis = await client.get(`resetToken:${id}`);
    if (!tokenFromRedis) {
      throw new AppError("Invalid or expired token", 400);
    }
    if (tokenFromRedis !== token) {
      throw new AppError("Invalid token", 400);
    }
    const user = await User.findById(id);
    if (!user) {
      throw new AppError("user does not exist", 400);
    }
    user.password = await bcryptjs.hash(password, 10);
    await user.save();
    const msg = PASSWORD_RESET_SUCCESS_TEMPLATE;
    await sendMail(user.email, "Password reset successful", msg);
    await client.del(`resetToken:${id}`);
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
        await client.setEx(`blacklist:${token}`, expiresAt, "blacklisted");
      }
    } catch (error) {
      next(error);
    }
  }

  res.clearCookie("Token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.status(200).json({ message: "Logout Successful" });
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user,
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

    let user = await User.findOne({ email });

    // 🆕 SIGNUP
    if (!user) {
      user = await User.create({
        username: name,
        email,
        googleId,
        authProvider: "google",
        isVerified: true,
      });
    }

    // 🔁 LOGIN (existing user)
    if (user.authProvider === "local" && !user.googleId) {
      // Optional: link accounts
      user.googleId = googleId;
      user.authProvider = "google";
      user.isVerified = true;
      await user.save();
    }

    user.lastlogin = new Date();
    await user.save();

    generateCookie(res, user._id);

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      message: "Google authentication successful",
      user: userResponse,
    });

  } catch (err) {
    next(err);
  }
};