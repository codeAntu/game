import { db } from "@/config/db";
import { depositTable, historyTable, withdrawTable } from "@/drizzle/schema";
import { findUserById } from "@/helpers/user/user";
import { isUser } from "@/middleware/auth";
import { getUser } from "@/utils/context";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const transaction = new Hono().basePath("/transaction");

// Updated depositValidator to enforce a minimum deposit amount of 10
const depositValidator = z.object({
  amount: z
    .number()
    .min(10, "Minimum deposit amount is 10")
    .positive("Amount must be positive"),
  transactionId: z.number().positive("Transaction ID is required"),
  upiId: z.string().min(1, "UPI ID is required"),
});

// Updated withdrawValidator to enforce a minimum withdrawal amount of 100
const withdrawValidator = z.object({
  amount: z
    .number()
    .min(100, "Minimum withdrawal amount is 100")
    .positive("Amount must be positive"),
  upiId: z.string().min(1, "UPI ID is required"),
});

transaction.use("/*", isUser);

transaction.post(
  "/deposit",
  zValidator("json", depositValidator),
  async (c) => {
    try {
      const { amount, transactionId, upiId } = await c.req.json();
      const user = getUser(c);
      const userProfile = await findUserById(user.id.toString());

      if (!userProfile) {
        return c.json({ message: "User not found!" }, 404);
      }

      await db
        .insert(depositTable)
        .values({
          userId: user.id,
          amount,
          transactionId,
          upiId,
          status: "pending",
        })
        .execute();

      return c.json({
        message: "Deposit request submitted successfully!",
        transactionAmount: amount,
      });
    } catch (error) {
      console.error("Error processing deposit:", error);
      return c.json(
        {
          message: "Failed to process deposit",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
);

transaction.post(
  "/withdraw",
  zValidator("json", withdrawValidator),
  async (c) => {
    try {
      const { amount, upiId } = await c.req.json();
      const user = getUser(c);

      const userProfile = await findUserById(user.id.toString());

      if (!userProfile) {
        return c.json({ message: "User not found!" }, 404);
      }

      if (userProfile.balance < amount) {
        return c.json({ message: "Insufficient balance!" }, 400);
      }
      await db
        .insert(withdrawTable)
        .values({
          userId: user.id,
          amount,
          upiId,
          status: "pending",
        })
        .execute();

      return c.json({
        message: "Withdrawal request submitted successfully!",
        transactionAmount: amount,
      });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      return c.json(
        {
          message: "Failed to process withdrawal",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
);

// Get user's complete transaction history
transaction.get("/history", async (c) => {
  try {
    const user = getUser(c);

    // Get history for the current user
    const history = await db
      .select()
      .from(historyTable)
      .where(eq(historyTable.userId, user.id))
      .orderBy(desc(historyTable.createdAt))
      .execute();

    return c.json({
      message: "Transaction history retrieved successfully",
      history,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return c.json(
      {
        message: "Failed to retrieve transaction history",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Add ability to filter history by transaction type
transaction.get("/history/:type", async (c) => {
  try {
    const user = getUser(c);
    const typeParam = c.req.param("type");

    // Define the valid transaction types
    const validTypes = [
      "deposit",
      "withdrawal",
      "tournament_entry",
      "tournament_winnings",
      "kill_reward",
      "balance_adjustment",
      "deposit_rejected",
      "withdrawal_rejected",
    ] as const;

    // Type guard to check if the provided type is valid
    const isValidType = (type: string): type is (typeof validTypes)[number] => {
      return validTypes.includes(type as any);
    };

    // Check if the provided type is valid
    if (!isValidType(typeParam)) {
      return c.json(
        {
          message: "Invalid transaction type",
          validTypes,
        },
        400
      );
    }

    // Get filtered history for the current user with properly typed parameter
    const history = await db
      .select()
      .from(historyTable)
      .where(
        and(
          eq(historyTable.userId, user.id),
          eq(historyTable.transactionType, typeParam)
        )
      )
      .orderBy(desc(historyTable.createdAt))
      .execute();

    return c.json({
      message: `${typeParam} history retrieved successfully`,
      history,
    });
  } catch (error) {
    console.error("Error fetching filtered transaction history:", error);
    return c.json(
      {
        message: "Failed to retrieve filtered transaction history",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default transaction;
