import { Hono } from "hono";
import auth from "./auth";

const user = new Hono().basePath("/user");

user.route("/", auth);

export default user;
