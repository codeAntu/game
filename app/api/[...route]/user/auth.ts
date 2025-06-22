import { db } from "@/config/db";
import { usersTable } from "@/drizzle/schema";
import {
  checkEmailInAdminTable,
  findUserInDatabase,
} from "@/helpers/user/user";
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

const auth = new Hono().basePath("/auth");

function generateAuthResponse(user: any) {
  const tokenData = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const authToken = jwt.sign(tokenData, process.env.JWT_SECRET!, {
    expiresIn: "1y",
  });

  return {
    token: authToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      balance: user.balance,
    },
  };
}

// SIGNUP ENDPOINT
auth.post("/signup", zValidator("json", signupValidator), async (c) => {
  try {
    const data = await c.req.json();
    const { email, password } = data;
    const emailExistsInAdminTable = await checkEmailInAdminTable(email);
    if (emailExistsInAdminTable) {
      return c.json(
        ErrorResponses.alreadyExists(
          "Email is already used for an admin account"
        ),
        409
      );
    }

    const existingUser = await findUserInDatabase(email);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    if (existingUser) {
      if (existingUser.isVerified) {
        return c.json(ErrorResponses.alreadyExists("User account"), 409);
      } else {
        console.log(
          "User exists but not verified, resending verification email."
        );

        await db
          .update(usersTable)
          .set({
            password: hashedPassword,
            verificationCode: verificationCode,
            verificationCodeExpires: verificationCodeExpires,
          })
          .where(eq(usersTable.id, existingUser.id));

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
    const userData = {
      email,
      name: email.split("@")[0],
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      isVerified: false,
      balance: 0,
    };

    const newUser = await db.insert(usersTable).values(userData);

    await sendVerificationEmail(email, verificationCode);

    return c.json(
      SuccessResponses.created(
        "User account created successfully! Please verify your email.",
        {
          isVerified: false,
          user: newUser,
        }
      ),
      201
    );
  } catch (error) {
    console.error("Error in signup process:", error);
    return c.json(
      ErrorResponses.serverError(
        "Failed to process signup. Please try again.",
        error
      ),
      500
    );
  }
});

// Add resend verification endpoint for consistency
auth.post(
  "/resend-verification",
  zValidator("json", signupValidator),
  async (c) => {
    try {
      const { email } = await c.req.json();
      const user = await findUserInDatabase(email);

      if (!user) {
        return c.json(ErrorResponses.notFound("User account"), 404);
      }

      if (user.isVerified) {
        return c.json(
          ErrorResponses.badRequest("Account already verified."),
          400
        );
      }

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verificationCodeExpires = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .update(usersTable)
        .set({
          verificationCode,
          verificationCodeExpires,
        })
        .where(eq(usersTable.id, user.id));
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
      console.error("Error resending verification:", error);
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

auth.post("/verify-otp", zValidator("json", verifyOtpValidator), async (c) => {
  try {
    const { email, verificationCode } = await c.req.json();
    const user = await findUserInDatabase(email);

    if (!user) {
      return c.json(
        ErrorResponses.notFound(
          "User account not found. Please sign up first."
        ),
        404
      );
    }

    if (user.isVerified) {
      return c.json(
        createSuccessResponse("Account already verified. Please login.", {
          isVerified: true,
        }),
        200
      );
    }

    if (user.verificationCode !== verificationCode) {
      return c.json(
        ErrorResponses.badRequest("Invalid verification code."),
        400
      );
    }

    const now = new Date();
    if (now > user.verificationCodeExpires) {
      return c.json(
        ErrorResponses.badRequest(
          "Verification code has expired. Please request a new code."
        ),
        400
      );
    }

    await db
      .update(usersTable)
      .set({
        isVerified: true,
        verificationCode: "",
      })
      .where(eq(usersTable.id, user.id));
    const verifiedUser = { ...user, isVerified: true };
    const authResponse = generateAuthResponse(verifiedUser);

    return c.json(
      createSuccessResponse("Account verified successfully.", {
        isVerified: true,
        ...authResponse,
      }),
      200
    );
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return c.json(
      ErrorResponses.serverError(
        "Failed to verify account. Please try again.",
        error
      ),
      500
    );
  }
});

auth.post("/login", zValidator("json", signupValidator), async (c) => {
  try {
    const data = await c.req.json();
    const { email, password } = data;
    const user = await findUserInDatabase(email);

    if (!user) {
      return c.json(ErrorResponses.notFound("User account"), 404);
    }

    if (!user.isVerified) {
      return c.json(
        ErrorResponses.unauthorized("User account not verified"),
        401
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return c.json(ErrorResponses.unauthorized("Invalid password"), 401);
    }

    const authResponse = generateAuthResponse(user);

    return c.json(
      createSuccessResponse("Login successful!", authResponse),
      200
    );
  } catch (error) {
    console.error("Error during login:", error);
    return c.json(
      ErrorResponses.serverError("Login failed. Please try again.", error),
      500
    );
  }
});

export default auth;
