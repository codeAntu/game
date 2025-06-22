import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { findAdminInDatabase } from "../helpers/admin/admin";
import { findUserInDatabase } from "../helpers/user/user";

export interface UserTokenPayload {
  id: number;
  email: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export const isUser = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Authentication required. Please log in." }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as UserTokenPayload;

    // Get fresh user data from database to ensure it's up to date
    const user = await findUserInDatabase(decoded.email);
    if (!user) {
      return c.json({ message: "User not found. Please login again." }, 401);
    }

    if (!user.isVerified) {
      return c.json(
        { message: "Account not verified. Please verify your account." },
        403
      );
    }

    // Add user data to the request context (include necessary fields but exclude sensitive data)
    c.set("user", {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance,
    });

    await next();
  } catch (error) {
    return c.json(
      {
        message: "Invalid or expired token. Please log in again.",
        error: error instanceof Error ? error.message : "Authentication error",
      },
      401
    );
  }
};

// Middleware to check if user is an admin
export const isAdmin = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Admin authentication required." }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as UserTokenPayload;

    if (!decoded.isAdmin) {
      return c.json({ message: "Admin access required." }, 403);
    }

    const admin = await findAdminInDatabase(decoded.email);

    if (!admin) {
      return c.json({ message: "Admin not found. Please login again." }, 401);
    }

    if (!admin.isVerified) {
      return c.json({ message: "Admin account not verified." }, 403);
    }

    c.set("admin", {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isAdmin: true,
    });

    await next();
  } catch (error) {
    return c.json(
      {
        message: "Invalid or expired admin token.",
        error: error instanceof Error ? error.message : "Authentication error",
      },
      401
    );
  }
};
