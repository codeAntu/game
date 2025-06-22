import { Context } from "hono";
import { AdminData, UserData } from "./types";

/**
 * Get typed admin data from context
 */
export function getAdmin(c: Context): AdminData {
  return c.get("admin");
}

/**
 * Get typed user data from context
 */
export function getUser(c: Context): UserData {
  return c.get("user");
}
