import { db } from "@/config/db";
import {
  depositTable,
  historyTable,
  rejectedDepositTable,
  rejectedWithdrawTable,
  usersTable,
  withdrawTable,
} from "@/drizzle/schema";
import { isAdmin } from "@/middleware/auth";
import { getAdmin } from "@/utils/context";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const transactionsRouter = new Hono().basePath("/transactions");

transactionsRouter.use("/*", isAdmin);

const statusUpdateValidator = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]),
    reason: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      return (
        data.status !== "rejected" ||
        (data.status === "rejected" && data.reason)
      );
    },
    {
      message: "Reason is required when rejecting a transaction",
      path: ["reason"],
    }
  );

transactionsRouter.get("/deposits", async (c) => {
  try {
    const admin = getAdmin(c);

    const deposits = await db
      .select({
        id: depositTable.id,
        userId: depositTable.userId,
        amount: depositTable.amount,
        transactionId: depositTable.transactionId,
        upiId: depositTable.upiId,
        status: depositTable.status,
        createdAt: depositTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(depositTable)
      .leftJoin(usersTable, eq(depositTable.userId, usersTable.id))
      .where(eq(depositTable.status, "pending"))
      .orderBy(desc(depositTable.createdAt));

    return c.json({
      message: "Deposits retrieved successfully",
      deposits,
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return c.json(
      {
        message: "Failed to fetch deposits",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

transactionsRouter.get("/withdrawals", async (c) => {
  try {
    const withdrawals = await db
      .select({
        id: withdrawTable.id,
        userId: withdrawTable.userId,
        amount: withdrawTable.amount,
        upiId: withdrawTable.upiId,
        status: withdrawTable.status,
        createdAt: withdrawTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(withdrawTable)
      .leftJoin(usersTable, eq(withdrawTable.userId, usersTable.id))
      .where(eq(withdrawTable.status, "pending"))
      .orderBy(desc(withdrawTable.createdAt));

    return c.json({
      message: "Withdrawals retrieved successfully",
      withdrawals,
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return c.json(
      {
        message: "Failed to fetch withdrawals",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

transactionsRouter.post(
  "/deposit/:id",
  zValidator("json", statusUpdateValidator),
  async (c) => {
    try {
      const admin = getAdmin(c);
      const id = Number(c.req.param("id"));
      const { status, reason } = await c.req.json();

      const deposit = await db
        .select()
        .from(depositTable)
        .where(eq(depositTable.id, id))
        .limit(1);

      if (!deposit || deposit.length === 0) {
        return c.json({ message: "Deposit not found" }, 404);
      }

      const userDeposit = deposit[0];

      await db
        .update(depositTable)
        .set({ status })
        .where(eq(depositTable.id, id))
        .execute();

      await db
        .insert(historyTable)
        .values({
          userId: userDeposit.userId,
          transactionType:
            status === "rejected" ? "deposit_rejected" : "deposit",
          amount: userDeposit.amount,
          balanceEffect: status === "approved" ? "increase" : "none",
          status,
          message:
            status === "rejected"
              ? `Deposit ${status} by admin - Reason: ${reason}`
              : `Deposit ${status} by admin - ID: ${id}`,
          referenceId: id,
        })
        .execute();

      if (status === "rejected") {
        await db
          .insert(rejectedDepositTable)
          .values({
            userId: userDeposit.userId,
            amount: userDeposit.amount,
            upiId: userDeposit.upiId,
            status: "rejected",
            reason: reason || "No reason provided",
          })
          .execute();
      }

      if (status === "approved") {
        const user = await db
          .select({ balance: usersTable.balance })
          .from(usersTable)
          .where(eq(usersTable.id, userDeposit.userId))
          .limit(1);

        if (user && user.length > 0) {
          const newBalance = user[0].balance + userDeposit.amount;
          await db
            .update(usersTable)
            .set({ balance: newBalance })
            .where(eq(usersTable.id, userDeposit.userId))
            .execute();

          await db
            .insert(historyTable)
            .values({
              userId: userDeposit.userId,
              transactionType: "balance_adjustment",
              amount: userDeposit.amount,
              balanceEffect: "increase",
              status: "completed",
              message: `Balance updated: +${userDeposit.amount} from deposit`,
              referenceId: id,
            })
            .execute();
        }
      }

      return c.json({
        message:
          status === "approved"
            ? "Deposit approved successfully"
            : status === "rejected"
            ? "Deposit rejected successfully"
            : "Deposit status updated successfully",
        status,
      });
    } catch (error) {
      console.error("Error updating deposit status:", error);
      return c.json(
        {
          message: "Failed to update deposit status",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
);

// Update withdrawal status
transactionsRouter.post(
  "/withdrawal/:id",
  zValidator("json", statusUpdateValidator),
  async (c) => {
    try {
      const admin = getAdmin(c);
      const id = Number(c.req.param("id"));
      const { status, reason } = await c.req.json();

      const withdrawal = await db
        .select()
        .from(withdrawTable)
        .where(eq(withdrawTable.id, id))
        .limit(1);

      if (!withdrawal || withdrawal.length === 0) {
        return c.json({ message: "Withdrawal not found" }, 404);
      }

      const userWithdrawal = withdrawal[0];

      await db
        .update(withdrawTable)
        .set({ status })
        .where(eq(withdrawTable.id, id))
        .execute();

      await db
        .insert(historyTable)
        .values({
          userId: userWithdrawal.userId,
          transactionType:
            status === "rejected" ? "withdrawal_rejected" : "withdrawal",
          amount: userWithdrawal.amount,
          balanceEffect: status === "approved" ? "decrease" : "none",
          status,
          message:
            status === "rejected"
              ? `Withdrawal ${status} by admin - Reason: ${reason}`
              : `Withdrawal ${status} by admin - ID: ${id}`,
          referenceId: id,
        })
        .execute();

      if (status === "rejected") {
        await db
          .insert(rejectedWithdrawTable)
          .values({
            userId: userWithdrawal.userId,
            amount: userWithdrawal.amount,
            upiId: userWithdrawal.upiId,
            status: "rejected",
            reason: reason || "No reason provided",
          })
          .execute();
      }

      if (status === "approved") {
        const user = await db
          .select({ balance: usersTable.balance })
          .from(usersTable)
          .where(eq(usersTable.id, userWithdrawal.userId))
          .limit(1);

        if (user && user.length > 0) {
          const newBalance = user[0].balance - userWithdrawal.amount;
          if (newBalance < 0) {
            return c.json({ message: "Insufficient user balance" }, 400);
          }

          await db
            .update(usersTable)
            .set({ balance: newBalance })
            .where(eq(usersTable.id, userWithdrawal.userId))
            .execute();

          await db
            .insert(historyTable)
            .values({
              userId: userWithdrawal.userId,
              transactionType: "balance_adjustment",
              amount: userWithdrawal.amount,
              balanceEffect: "decrease",
              status: "completed",
              message: `Balance updated: -${userWithdrawal.amount} from withdrawal`,
              referenceId: id,
            })
            .execute();
        }
      }

      return c.json({
        message:
          status === "approved"
            ? "Withdrawal approved successfully"
            : status === "rejected"
            ? "Withdrawal rejected successfully"
            : "Withdrawal status updated successfully",
        status,
      });
    } catch (error) {
      console.error("Error updating withdrawal status:", error);
      return c.json(
        {
          message: "Failed to update withdrawal status",
          error: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
);

// Get all transaction history
transactionsRouter.get("/history", async (c) => {
  try {
    const admin = getAdmin(c);

    const history = await db
      .select({
        id: historyTable.id,
        userId: historyTable.userId,
        amount: historyTable.amount,
        status: historyTable.status,
        message: historyTable.message,
        createdAt: historyTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(historyTable)
      .leftJoin(usersTable, eq(historyTable.userId, usersTable.id))
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
        message: "Failed to fetch transaction history",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get history for specific user
transactionsRouter.get("/history/:userId", async (c) => {
  try {
    const userId = Number(c.req.param("userId"));

    const history = await db
      .select()
      .from(historyTable)
      .where(eq(historyTable.userId, userId))
      .orderBy(desc(historyTable.createdAt))
      .execute();

    return c.json({
      message: "User transaction history retrieved successfully",
      history,
    });
  } catch (error) {
    console.error("Error fetching user transaction history:", error);
    return c.json(
      {
        message: "Failed to fetch user transaction history",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get all rejected deposits
transactionsRouter.get("/deposits/rejected", async (c) => {
  try {
    const rejectedDeposits = await db
      .select({
        id: rejectedDepositTable.id,
        userId: rejectedDepositTable.userId,
        amount: rejectedDepositTable.amount,
        upiId: rejectedDepositTable.upiId,
        status: rejectedDepositTable.status,
        reason: rejectedDepositTable.reason,
        createdAt: rejectedDepositTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(rejectedDepositTable)
      .leftJoin(usersTable, eq(rejectedDepositTable.userId, usersTable.id))
      .orderBy(desc(rejectedDepositTable.createdAt));

    return c.json({
      message: "Rejected deposits retrieved successfully",
      rejectedDeposits,
    });
  } catch (error) {
    console.error("Error fetching rejected deposits:", error);
    return c.json(
      {
        message: "Failed to fetch rejected deposits",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get all rejected withdrawals
transactionsRouter.get("/withdrawals/rejected", async (c) => {
  try {
    const rejectedWithdrawals = await db
      .select({
        id: rejectedWithdrawTable.id,
        userId: rejectedWithdrawTable.userId,
        amount: rejectedWithdrawTable.amount,
        upiId: rejectedWithdrawTable.upiId,
        status: rejectedWithdrawTable.status,
        reason: rejectedWithdrawTable.reason,
        createdAt: rejectedWithdrawTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(rejectedWithdrawTable)
      .leftJoin(usersTable, eq(rejectedWithdrawTable.userId, usersTable.id))
      .orderBy(desc(rejectedWithdrawTable.createdAt));

    return c.json({
      message: "Rejected withdrawals retrieved successfully",
      rejectedWithdrawals,
    });
  } catch (error) {
    console.error("Error fetching rejected withdrawals:", error);
    return c.json(
      {
        message: "Failed to fetch rejected withdrawals",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default transactionsRouter;
