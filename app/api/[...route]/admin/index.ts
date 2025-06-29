import { Hono } from "hono";
import tournamentApi from "./tournaments";
import users from "./users";
import adminAuth from "./auth";
import transactions from "./transactions";

const admin = new Hono().basePath("/admin");

admin.route("/", adminAuth);
admin.route("/", users);
admin.route("/", tournamentApi);
admin.route("/", transactions);

export default admin;
