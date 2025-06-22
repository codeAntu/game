import { Hono } from "hono";


const admin = new Hono().basePath("/admin");






export default admin;