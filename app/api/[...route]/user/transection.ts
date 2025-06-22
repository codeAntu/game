import { db } from "@/config/db";
import { depositTable, historyTable, withdrawTable } from "@/drizzle/schema";
import { findUserById } from "@/helpers/user/user";
import { isUser } from "@/middleware/auth";
import { getUser } from "@/utils/context";
import { createErrorResponse, createSuccessResponse } from "@/utils/responses";
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
        return c.json(createErrorResponse("User not found"), 404);
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

      return c.json(
        createSuccessResponse("Deposit request submitted successfully", {
          transactionAmount: amount,
        })
      );
    } catch (error) {
      console.error("Error processing deposit:", error);
      return c.json(
        createErrorResponse("Failed to process deposit", error),
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
        return c.json(createErrorResponse("User not found"), 404);
      }

      if (userProfile.balance < amount) {
        return c.json(createErrorResponse("Insufficient balance"), 400);
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

      return c.json(
        createSuccessResponse("Withdrawal request submitted successfully", {
          transactionAmount: amount,
        })
      );
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      return c.json(
        createErrorResponse("Failed to process withdrawal", error),
        500
      );
    }
  }
);

// Get user's complete transaction history
transaction.get("/history", async (c) => {
  try {
    const user = getUser(c);

    const history = await db
      .select()
      .from(historyTable)
      .where(eq(historyTable.userId, user.id))
      .orderBy(desc(historyTable.createdAt))
      .execute();

    return c.json(
      createSuccessResponse("Transaction history retrieved successfully", {
        history,
      })
    );
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return c.json(
      createErrorResponse("Failed to retrieve transaction history", error),
      500
    );
  }
});

// Add ability to filter history by transaction type
transaction.get("/history/:type", async (c) => {
  try {
    const user = getUser(c);
    const typeParam = c.req.param("type");

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

    const isValidType = (type: string): type is (typeof validTypes)[number] => {
      return validTypes.includes(type as any);
    };

    if (!isValidType(typeParam)) {
      return c.json(
        createErrorResponse("Invalid transaction type", {
          validTypes,
        }),
        400
      );
    }

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

    return c.json(
      createSuccessResponse(`${typeParam} history retrieved successfully`, {
        history,
      })
    );
  } catch (error) {
    console.error("Error fetching filtered transaction history:", error);
    return c.json(
      createErrorResponse(
        "Failed to retrieve filtered transaction history",
        error
      ),
      500
    );
  }
});

export default transaction;
