import { z } from "zod";

export const participationValidator = z.object({
  playerUsername: z.string().min(1, "Player username is required"),
  playerUserId: z.string().min(1, "Player ID is required"),
  playerLevel: z.number().int().min(30, "Player level must be at least 30"),
});

export type ParticipationType = z.infer<typeof participationValidator>;
