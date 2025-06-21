import { z } from "zod";

const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
const imageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= maxSizeInBytes, {
    message: "Image must be less than 5MB",
  });

export const tournamentsValidation = z
  .object({
    game: z.enum(["BGMI", "FREEFIRE"]),
    name: z.string().min(1).max(50),
    description: z.string().max(255).optional(),
    image: z.any().optional(),
    roomId: z
      .string()
      .optional()
      .default("0")
      .refine((val) => !isNaN(Number(val)), {
        message: "Room ID must be a valid numeric string",
      }),
    roomPassword: z.string().max(255).optional(),
    entryFee: z.number().int().nonnegative(),
    prize: z.number().int().nonnegative(),
    perKillPrize: z.number().int().nonnegative(),
    maxParticipants: z.number().int().positive(),
    scheduledAt: z
      .string()
      .refine((dateTimeStr) => !isNaN(Date.parse(dateTimeStr)), {
        message: "Invalid date/time format",
      }),
  })
  .refine(
    (data) => {
      const now = new Date();
      const tournamentDateTime = new Date(data.scheduledAt as string);
      return tournamentDateTime > now;
    },
    {
      message: "Tournament date and time must be in the future",
      path: ["scheduledAt"],
    }
  );

export const tournamentUpdateValidation = z.object({
  roomId: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Room ID must be a valid numeric string",
  }),
  roomPassword: z.string().max(255).optional(),
});

// Kill money validation schema
export const killMoneyValidation = z.object({
  userId: z
    .number({
      required_error: "User ID is required",
      invalid_type_error: "User ID must be a number",
    })
    .positive("User ID must be positive"),

  kills: z
    .number({
      required_error: "Kills count is required",
      invalid_type_error: "Kills count must be a number",
    })
    .min(0, "Kills count cannot be negative")
    .max(100, "Kills count cannot exceed 100"),
});

// Tournament edit validation schema - all fields are optional for partial updates
export const tournamentEditValidation = z
  .object({
    game: z.enum(["BGMI", "FREEFIRE"]).optional(),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(255).optional(),
    roomId: z
      .string()
      .optional()
      .transform((val) => val || "0")
      .refine((val) => !isNaN(Number(val)), {
        message: "Room ID must be a valid numeric string",
      }),
    roomPassword: z.string().max(255).optional(),
    entryFee: z.number().int().nonnegative().optional(),
    prize: z.number().int().nonnegative().optional(),
    perKillPrize: z.number().int().nonnegative().optional(),
    maxParticipants: z.number().int().positive().optional(),
    scheduledAt: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date/time format",
      }),
  })
  .refine(
    (data) => {
      if (!data.scheduledAt) return true;
      const now = new Date();
      const tournamentDateTime = new Date(data.scheduledAt as string);
      return tournamentDateTime > now;
    },
    {
      message: "Tournament date and time must be in the future",
      path: ["scheduledAt"],
    }
  );

export type TournamentType = z.infer<typeof tournamentsValidation>;

export type TournamentUpdateType = z.infer<typeof tournamentUpdateValidation>;

export type KillMoneyType = z.infer<typeof killMoneyValidation>;

export type TournamentEditType = z.infer<typeof tournamentEditValidation>;
