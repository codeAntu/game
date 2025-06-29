import { Hono } from "hono";
import auth from "../user/auth";
import tournamentApi from "./tournaments";
import users from "./users";

const admin = new Hono().basePath("/admin");

admin.route("/", auth);
admin.route("/", users);
admin.route("/", tournamentApi);

export default admin;
