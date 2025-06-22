import { Hono } from "hono";
import auth from "../user/auth";
import users from "./users";
import { isAdmin } from "@/middleware/auth";

const admin = new Hono().basePath("/admin");

admin.route("/", auth);
admin.route("/", users);

export default admin;
