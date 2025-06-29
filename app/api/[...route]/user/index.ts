import { Hono } from "hono";
import auth from "./auth";
import tournamentApi from "./tournaments";
import profile from "./profile";
import transaction from "./transaction";

const user = new Hono().basePath("/user");

user.route("/", auth);
user.route("/", tournamentApi);
user.route("/", profile);
user.route("/", transaction);

export default user;
