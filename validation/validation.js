import { z } from "zod";
export const signupSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),

    email: z
      .email("Please enter a valid email address")
      .min(5, "Email must be at least 5 characters"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),

    confirmPassword: z.string(),

    terms: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions"
      ),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z
      .email("Please enter a valid email address")
      .min(5, "Email must be at least 5 characters"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
  }),
});

export const ForgetPasswordSchema = z.object({
  body: z.object({
    email: z
      .email("Please enter a valid email address")
      .min(5, "Email must be at least 5 characters"),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
  }),
});
