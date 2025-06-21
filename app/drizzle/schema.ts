import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const bigintUnsigned = bigint({ mode: "number" });

// Users table with constraint
export const usersTable = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("name", { length: 255 }).notNull().default(""),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationCode: varchar("verification_code", { length: 255 }).notNull(),
    verificationCodeExpires: timestamp("verification_code_expires").notNull(),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("balance_non_negative", sql`${table.balance} >= 0`)]
);

// Renamed to avoid collision with existing table
export const adminTable = pgTable("admin", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: varchar("verification_code", { length: 255 }).notNull(),
  verificationCodeExpires: timestamp("verification_code_expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Games table to store game information
export const gamesTable = pgTable("games", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  icon: varchar("icon", { length: 255 }),
  thumbnail: varchar("thumbnail", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tournaments table with combined datetime
export const tournamentsTable = pgTable(
  "tournaments",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => adminTable.id),
    game: varchar("game", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    image: varchar("image", { length: 255 }),
    description: varchar("description", { length: 255 }),
    roomId: varchar("room_id", { length: 255 }).default("0"),
    roomPassword: varchar("room_password", { length: 255 }),
    entryFee: integer("entry_fee").notNull(),
    prize: integer("prize").notNull(),
    perKillPrize: integer("per_kill_prize").notNull(),
    maxParticipants: integer("max_participants").notNull(),
    currentParticipants: integer("current_participants").notNull().default(0),
    scheduledAt: timestamp("scheduled_at").notNull(),
    isEnded: boolean("is_ended").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("entry_fee_non_negative", sql`${table.entryFee} >= 0`),
    check("prize_non_negative", sql`${table.prize} >= 0`),
    check("per_kill_prize_non_negative", sql`${table.perKillPrize} >= 0`),
    check(
      "current_participants_non_negative",
      sql`${table.currentParticipants} >= 0`
    ),
    check(
      "current_participants_max",
      sql`${table.currentParticipants} <= ${table.maxParticipants}`
    ),
  ]
);

// Tournament participants table with player information
export const tournamentParticipantsTable = pgTable("tournament_participants", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
  playerUsername: varchar("player_username", { length: 255 }).notNull(),
  playerUserId: varchar("player_user_id", { length: 255 }).notNull(),
  playerLevel: integer("player_level").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Define enums
export const winningsTypeEnum = pgEnum("winnings_type", ["winnings", "kill"]);

// Winnings table with corrected reference type
export const winningsTable = pgTable("winnings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournamentsTable.id),
  amount: integer("amount").notNull(),
  type: winningsTypeEnum("type").notNull().default("winnings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const depositTable = pgTable("deposit", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  transactionId: bigintUnsigned.notNull(),
  upiId: varchar("upi_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawTable = pgTable("withdraw", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  amount: integer("amount").notNull(),
  upiId: varchar("upi_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define enums for history table
export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "tournament_entry",
  "tournament_winnings",
  "kill_reward",
  "balance_adjustment",
  "deposit_rejected",
  "withdrawal_rejected",
]);

export const balanceEffectEnum = pgEnum("balance_effect", [
  "increase",
  "decrease",
  "none",
]);

// Withdraw history table with corrected reference type
export const historyTable = pgTable("history", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  amount: integer("amount").notNull(),
  balanceEffect: balanceEffectEnum("balance_effect").notNull().default("none"),
  status: varchar("status", { length: 255 }).notNull(),
  message: varchar("message", { length: 255 }).notNull(),
  referenceId: integer("reference_id"), // Can store deposit/withdraw/tournament ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rejectedWithdrawTable = pgTable("rejected_withdraw", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  amount: integer("amount").notNull(),
  upiId: varchar("upi_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rejectedDepositTable = pgTable("rejected_deposit", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  amount: integer("amount").notNull(),
  upiId: varchar("upi_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
