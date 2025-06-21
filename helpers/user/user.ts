import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { adminTable, usersTable } from "@/drizzle/schema";

export async function findUserInDatabase(email: string) {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return users.length > 0 ? users[0] : null;
}

export async function findUserById(id: string) {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, Number(id)));
  return users.length > 0 ? users[0] : null;
}

export async function checkEmailInAdminTable(email: string) {
  const admin = await db
    .select()
    .from(adminTable)
    .where(eq(adminTable.email, email));
  return admin.length > 0;
}

export async function createUser(userData: {
  email: string;
  password: string;
  validationCode: string;
  verificationCodeExpires: Date;
}) {
  console.log(userData);

  const newUser = await db
    .insert(usersTable)
    .values({
      email: userData.email,
      password: userData.password,
      balance: 0,
      verificationCode: "",
      verificationCodeExpires: new Date(),
    })
    .returning();

  const userId = newUser[0].id;
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return user[0];
}
