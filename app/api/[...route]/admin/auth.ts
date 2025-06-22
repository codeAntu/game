import { db } from "@/config/db";
import { adminTable } from "@/drizzle/schema";
import {
  checkEmailInUserTable,
  findAdminInDatabase,
} from "@/helpers/admin/admin";
import { sendVerificationEmail } from "@/mail/mailer";
import {
  createSuccessResponse,
  ErrorResponses,
  SuccessResponses,
} from "@/utils/responses";
import { signupValidator, verifyOtpValidator } from "@/zod/auth";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import jwt from "jsonwebtoken";
const adminAuth = new Hono().basePath("/auth");

function generateAuthResponse(admin: any) {
  const tokenData = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isAdmin: true,
  };

  const authToken = jwt.sign(tokenData, process.env.JWT_SECRET!, {
    expiresIn: "1d",
  });

  return {
    token: authToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
    },
  };
}

adminAuth.post("/signup", zValidator("json", signupValidator), async (c) => {
  try {
    const data = await c.req.json();
    const { email, password, name } = data;
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.split(" ")[1];

    // Ensure consistent behavior with user auth - don't require token for signup
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET!);
        return c.json(
          ErrorResponses.unauthorized("You are already logged in."),
          401
        );
      } catch (error) {
        // Token is invalid, continue with signup
      }
    }

    const emailExistsInUserTable = await checkEmailInUserTable(email);
    if (emailExistsInUserTable) {
      return c.json(
        ErrorResponses.alreadyExists(
          "Email is already used for a user account"
        ),
        409
      );
    }

    const existingAdmin = await findAdminInDatabase(email);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (existingAdmin) {
      if (existingAdmin.isVerified) {
        return c.json(ErrorResponses.alreadyExists("Admin account"), 409);
      } else {
        // Admin exists but not verified, resend verification
        await db
          .update(adminTable)
          .set({
            password: hashedPassword,
            verificationCode,
            verificationCodeExpires,
          })
          .where(eq(adminTable.id, existingAdmin.id));

        await sendVerificationEmail(email, verificationCode);

        return c.json(
          createSuccessResponse(
            "Verification email resent. Please check your inbox.",
            {
              isVerified: false,
            }
          ),
          200
        );
      }
    }

    const adminData = {
      email,
      name: name || email.split("@")[0],
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
    };

    const newAdmin = await db.insert(adminTable).values(adminData);
    await sendVerificationEmail(email, verificationCode);

    return c.json(
      SuccessResponses.created(
        "Admin account created successfully! Please verify your email.",
        {
          isVerified: false,
          admin: newAdmin,
        }
      ),
      201
    );
  } catch (error) {
    console.error("Error in admin signup process:", error);
    return c.json(
      ErrorResponses.serverError(
        "Failed to process admin signup. Please try again.",
        error
      ),
      500
    );
  }
});

// Add resend verification endpoint
adminAuth.post(
  "/resend-verification",
  zValidator("json", signupValidator),
  async (c) => {
    try {
      const { email } = await c.req.json();

      const admin = await findAdminInDatabase(email);

      if (!admin) {
        return c.json(ErrorResponses.notFound("Admin account"), 404);
      }

      if (admin.isVerified) {
        return c.json(
          ErrorResponses.badRequest("Admin account already verified."),
          400
        );
      }

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .update(adminTable)
        .set({
          verificationCode,
          verificationCodeExpires,
        })
        .where(eq(adminTable.id, admin.id));

      await sendVerificationEmail(email, verificationCode);

      return c.json(
        createSuccessResponse(
          "Verification email sent. Please check your inbox.",
          {
            isVerified: false,
          }
        ),
        200
      );
    } catch (error) {
      console.error("Error resending admin verification:", error);
      return c.json(
        ErrorResponses.serverError(
          "Failed to resend verification email. Please try again.",
          error
        ),
        500
      );
    }
  }
);

adminAuth.post("/login", zValidator("json", signupValidator), async (c) => {
  try {
    const data = await c.req.json();
    const { email, password } = data;
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.split(" ")[1];

    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET!);
        return c.json(
          ErrorResponses.unauthorized("You are already logged in."),
          401
        );
      } catch (error) {
        // Token is invalid, continue with login
      }
    }

    const admin = await findAdminInDatabase(email);

    if (!admin) {
      return c.json(ErrorResponses.notFound("Admin account"), 404);
    }

    // Check if admin is verified
    if (!admin.isVerified) {
      return c.json(
        ErrorResponses.unauthorized("Admin account not verified"),
        401
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return c.json(ErrorResponses.unauthorized("Invalid password"), 401);
    }

    const authResponse = generateAuthResponse(admin);

    return c.json(
      createSuccessResponse("Admin login successful!", authResponse),
      200
    );
  } catch (error) {
    console.error("Error during admin login:", error);
    return c.json(
      ErrorResponses.serverError("Login failed. Please try again.", error),
      500
    );
  }
});

// ADMIN VERIFY OTP ENDPOINT
adminAuth.post(
  "/verify-otp",
  zValidator("json", verifyOtpValidator),
  async (c) => {
    try {
      const { email, verificationCode } = await c.req.json();

      // Find the admin
      const admin = await findAdminInDatabase(email);

      // Check if admin exists
      if (!admin) {
        return c.json(
          ErrorResponses.notFound(
            "Admin account not found. Please sign up first."
          ),
          404
        );
      }

      // Check if admin is already verified
      if (admin.isVerified) {
        return c.json(
          createSuccessResponse(
            "Admin account already verified. Please login.",
            {
              isVerified: true,
            }
          ),
          200
        );
      }

      // Check if verification code is correct
      if (admin.verificationCode !== verificationCode) {
        return c.json(
          ErrorResponses.badRequest("Invalid verification code."),
          400
        );
      }

      // Check if verification code is expired
      const now = new Date();
      if (now > admin.verificationCodeExpires) {
        return c.json(
          ErrorResponses.badRequest(
            "Verification code has expired. Please request a new code."
          ),
          400
        );
      }

      // Verify the admin
      await db
        .update(adminTable)
        .set({
          isVerified: true,
          verificationCode: "", // Clear verification code after successful verification
        })
        .where(eq(adminTable.id, admin.id));

      // Get updated admin info and generate auth response
      const verifiedAdmin = { ...admin, isVerified: true };
      const authResponse = generateAuthResponse(verifiedAdmin);

      return c.json(
        createSuccessResponse(
          "Admin account verified successfully. You can now login.",
          {
            isVerified: true,
            ...authResponse,
          }
        ),
        200
      );
    } catch (error) {
      console.error("Error verifying admin OTP:", error);
      return c.json(
        ErrorResponses.serverError(
          "Failed to verify admin account. Please try again.",
          error
        ),
        500
      );
    }
  }
);

export default adminAuth;
