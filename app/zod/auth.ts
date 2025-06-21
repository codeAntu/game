import { z } from "zod";

const signupValidator = z
  .object({
    email: z
      .string({ required_error: "Email is required" }) //
      .trim()
      .toLowerCase()
      .email({ message: "Invalid email format" }),
    password: z
      .string({ required_error: "Password is required" })
      .trim()
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(100, { message: "Password must be at most 100 characters long" }),
  })
  .strict();

export { signupValidator };
// Define the OTP verification validator schema

export const verifyOtpValidator = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email({ message: "Invalid email format" }),
    verificationCode: z
      .string({ required_error: "OTP is required" })
      .trim()
      .min(6, { message: "OTP must be at least 6 characters long" })
      .max(6, { message: "OTP must be at most 6 characters long" }),
  })
  .strict()
  .refine((data) => data.email || data.verificationCode, {
    message: "Email and OTP is required",
  });
