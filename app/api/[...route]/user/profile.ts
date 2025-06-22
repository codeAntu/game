import { findUserById } from "@/helpers/user/user";
import { Hono } from "hono";
import jwt from "jsonwebtoken";

const profile = new Hono().basePath("/profile");

profile.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  console.log("Authorization header:", authHeader);

  if (!token) {
    return c.json({ message: "No token provided!" }, 401);
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET!);

  if (!decodedToken || typeof decodedToken === "string") {
    return c.json({ message: "Invalid token!" }, 401);
  }

  const userProfile = await findUserById(decodedToken.id);

  if (!userProfile) {
    return c.json({ message: "User not found!" }, 404);
  }

  return c.json({
    message: "User profile fetched successfully!",
    user: {
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      balance: userProfile.balance,
    },
  });
});

export default profile;
