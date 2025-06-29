import { Hono } from "hono";
import tournamentApi from "./tournaments";
import users from "./users";
import adminAuth from "./auth";

const admin = new Hono().basePath("/admin");

admin.route("/", adminAuth);
admin.route("/", users);
admin.route("/", tournamentApi);

export default admin;
