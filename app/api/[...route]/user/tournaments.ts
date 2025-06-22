import {
  getAllUserTournaments,
  getParticipatedTournaments,
  getTournamentById,
  getUserTournamentsByName,
  getUserWinnings,
  isUserParticipatedInTournament,
  participateInTournament,
} from "@/helpers/user/tournaments";
import { isUser } from "@/middleware/auth";
import { getUser } from "@/utils/context";
import { participationValidator } from "@/zod/participation";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const tournamentApi = new Hono().basePath("/tournaments");

tournamentApi.use("/*", isUser);

tournamentApi.get("/", async (c) => {
  try {
    const user = getUser(c);

    const tournaments = await getAllUserTournaments(user.id);
    if (!tournaments) {
      return c.json({ message: "No tournaments found" }, 404);
    }

    return c.json({
      message: "Tournaments retrieved successfully",
      data: tournaments,
    });
  } catch (error: unknown) {
    console.error("Error retrieving tournaments:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve tournaments";
    return c.json({ error: errorMessage }, 500);
  }
});

tournamentApi.get("/participated", async (c) => {
  try {
    const user = getUser(c);

    const tournaments = await getParticipatedTournaments(user.id);
    if (!tournaments || tournaments.length === 0) {
      return c.json({ message: "No participated tournaments found" }, 404);
    }

    return c.json({
      message: "Participated tournaments retrieved successfully",
      tournaments,
    });
  } catch (error) {
    console.error("Error retrieving participated tournaments:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to retrieve participated tournaments";
    return c.json({ error: errorMessage }, 500);
  }
});

tournamentApi.get("/winnings", async (c) => {
  try {
    const user = getUser(c);

    const winnings = await getUserWinnings(user.id);
    if (!winnings || winnings.length === 0) {
      return c.json({ message: "No tournament winnings found" }, 404);
    }

    return c.json({
      message: "Tournament winnings retrieved successfully",
      data: winnings,
    });
  } catch (error) {
    console.error("Error retrieving winnings:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve winnings";
    return c.json({ error: errorMessage }, 500);
  }
});

tournamentApi.get("/isParticipated/:tournamentId", async (c) => {
  try {
    const user = getUser(c);
    const tournamentId = c.req.param("tournamentId");
    if (!tournamentId) {
      return c.json({ error: "Tournament ID is required" }, 400);
    }

    const participation = await isUserParticipatedInTournament(
      Number(tournamentId),
      user.id
    );

    return c.json({
      message: "Participation status retrieved successfully",
      participation,
    });
  } catch (error) {
    console.error("Error checking participation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check participation";
    return c.json({ error: errorMessage }, 500);
  }
});

tournamentApi.post(
  "/participate/:tournamentId",
  zValidator("json", participationValidator),
  async (c) => {
    try {
      const user = getUser(c);
      const tournamentId = c.req.param("tournamentId");
      if (!tournamentId) {
        return c.json({ error: "Tournament ID is required" }, 400);
      }

      // The body is now validated by zValidator
      // Extract all required fields including playerLevel
      const { playerUsername, playerUserId, playerLevel } = await c.req.valid(
        "json"
      );

      const participate = await participateInTournament(
        Number(tournamentId),
        user.id,
        playerUsername,
        playerUserId,
        playerLevel
      );

      return c.json({
        message: "Successfully participated in the tournament",
        participate,
      });
    } catch (error: unknown) {
      console.error("Error participating in tournament:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to participate in tournament";
      return c.json({ error: errorMessage }, 500);
    }
  }
);

tournamentApi.get("/game/:name", async (c) => {
  try {
    const user = getUser(c);
    const gameName = c.req.param("name");
    if (!gameName) {
      return c.json({ error: "Game name is required" }, 400);
    }

    const tournaments = await getUserTournamentsByName(user.id, gameName);
    if (!tournaments) {
      return c.json({ message: "No tournaments found" }, 404);
    }
    return c.json({
      message: "Tournaments retrieved successfully",
      tournaments,
    });
  } catch (error) {
    console.error("Error retrieving tournaments:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve tournaments";
    return c.json({ error: errorMessage }, 500);
  }
});

// Move the parameterized route after all specific routes
tournamentApi.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const tournamentId = c.req.param("id");
    if (!tournamentId) {
      return c.json({ error: "Tournament ID is required" }, 400);
    }

    const tournaments = await getTournamentById(user.id, Number(tournamentId));
    if (!tournaments) {
      return c.json({ message: "Tournament not found" }, 404);
    }

    return c.json({
      message: "Tournament retrieved successfully",
      data: tournaments,
    });
  } catch (error) {
    console.error("Error retrieving tournament:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve tournament";
    return c.json({ error: errorMessage }, 500);
  }
});

export default tournamentApi;
