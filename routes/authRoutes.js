import express from 'express';
import {
  forgetPassword,
  login,
  logout,
  resendOtp,
  signup,
  verifyEmail,
  verifyLoginOtp,
  resetPassword,
  checkAuth,
  googleAuth,
} from '../controllers/authController.js';
import { verifyToken } from '../helpers/validateToken.js';
import { signupSchema, LoginSchema, ForgetPasswordSchema, ResetPasswordSchema } from '../validation/validation.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { config } from '../config.js';

const router = express.Router();

/**
 * Dynamic signup validator.
 * Uses config.signupValidationSchema if provided by the consumer,
 * otherwise falls back to the built-in signupSchema.
 */
const dynamicSignupValidate = (req, res, next) => {
  const schema = config.signupValidationSchema || signupSchema;
  return validate(schema)(req, res, next);
};

router.get('/check-auth', verifyToken, checkAuth);
router.post('/signup', dynamicSignupValidate, signup);
router.get('/verifyEmail/:id', verifyEmail);
router.post('/login', validate(LoginSchema), login);
router.post('/verifyLoginOtp/:id', verifyLoginOtp);
router.post('/resendOtp/:id', resendOtp);
router.post('/forgotPassword', validate(ForgetPasswordSchema), forgetPassword);
router.post('/resetPassword/:id/:token', validate(ResetPasswordSchema), resetPassword);
router.post('/logout', logout);
router.post('/google', googleAuth);

export default router;