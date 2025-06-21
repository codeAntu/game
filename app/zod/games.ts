import { z } from "zod";

// Define enum for game names
export const GameNameEnum = {
  PUBG: "PUBG",
  FREEFIRE: "FREEFIRE",
} as const;

export const gameValidator = z.object({
  name: z.enum([GameNameEnum.PUBG, GameNameEnum.FREEFIRE]),
  description: z.string().max(500).optional(),
  icon: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
});

export const gameUpdateValidator = z.object({
  name: z.enum([GameNameEnum.PUBG, GameNameEnum.FREEFIRE]).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
});

// Infer the types
export type GameType = z.infer<typeof gameValidator>;
export type GameUpdateType = z.infer<typeof gameUpdateValidator>;
