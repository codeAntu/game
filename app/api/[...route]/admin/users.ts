import { db } from "@/config/db";
import { usersTable } from "@/drizzle/schema";
import { isAdmin } from "@/middleware/auth";
import { getAdmin } from "@/utils/context";
import {
  createSuccessResponse,
  ErrorResponses
} from "@/utils/responses";
import { Hono } from "hono";

const users = new Hono().basePath("/users");

users.use("/*", isAdmin);

users.get("/", async (c) => {
  try {
    const users = await db.select().from(usersTable).execute();
    const admin = getAdmin(c);

    console.log("Admin ID:", admin.id);
    return c.json(
      createSuccessResponse("Users fetched successfully", {
        users,
      }),
      200
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json(
      ErrorResponses.serverError("Failed to fetch users", error),
      500
    );
  }
});

export default users;
