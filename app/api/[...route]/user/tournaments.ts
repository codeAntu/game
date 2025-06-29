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
import { createErrorResponse, createSuccessResponse } from "@/utils/responses";
import { participationValidator } from "@/zod/participation";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const tournamentApi = new Hono().basePath("/tournaments");

tournamentApi.use("/*", isUser);

tournamentApi.get("/", async (c) => {
  try {
    const user = getUser(c);

    const tournaments = await getAllUserTournaments(user.id);
    if (!tournaments || tournaments.length === 0) {
      return c.json(createErrorResponse("No tournaments found"), 404);
    }

    return c.json(
      createSuccessResponse("Tournaments retrieved successfully", {
        tournaments,
      })
    );
  } catch (error: unknown) {
    console.error("Error retrieving tournaments:", error);
    return c.json(
      createErrorResponse("Failed to retrieve tournaments", error),
      500
    );
  }
});

tournamentApi.get("/participated", async (c) => {
  try {
    const user = getUser(c);

    const tournaments = await getParticipatedTournaments(user.id);
    if (!tournaments || tournaments.length === 0) {
      return c.json(
        createErrorResponse("No participated tournaments found"),
        200
      );
    }

    return c.json(
      createSuccessResponse("Participated tournaments retrieved successfully", {
        tournaments,
      })
    );
  } catch (error) {
    console.error("Error retrieving participated tournaments:", error);
    return c.json(
      createErrorResponse("Failed to retrieve participated tournaments", error),
      500
    );
  }
});

tournamentApi.get("/winnings", async (c) => {
  try {
    const user = getUser(c);

    const winnings = await getUserWinnings(user.id);
    if (!winnings || winnings.length === 0) {
      return c.json(createErrorResponse("No tournament winnings found"), 404);
    }

    return c.json(
      createSuccessResponse("Tournament winnings retrieved successfully", {
        winnings,
      })
    );
  } catch (error) {
    console.error("Error retrieving winnings:", error);
    return c.json(
      createErrorResponse("Failed to retrieve winnings", error),
      500
    );
  }
});

tournamentApi.get("/isParticipated/:tournamentId", async (c) => {
  try {
    const user = getUser(c);
    const tournamentId = c.req.param("tournamentId");
    if (!tournamentId) {
      return c.json(createErrorResponse("Tournament ID is required"), 400);
    }

    const participation = await isUserParticipatedInTournament(
      Number(tournamentId),
      user.id
    );

    return c.json(
      createSuccessResponse("Participation status retrieved successfully", {
        participation,
      })
    );
  } catch (error) {
    console.error("Error checking participation:", error);
    return c.json(
      createErrorResponse("Failed to check participation", error),
      500
    );
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
        return c.json(createErrorResponse("Tournament ID is required"), 400);
      }

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

      return c.json(
        createSuccessResponse("Successfully participated in the tournament", {
          participate,
        })
      );
    } catch (error: unknown) {
      console.error("Error participating in tournament:", error);
      return c.json(
        createErrorResponse("Failed to participate in tournament", error),
        500
      );
    }
  }
);

tournamentApi.get("/game/:name", async (c) => {
  try {
    const user = getUser(c);
    const gameName = c.req.param("name");
    if (!gameName) {
      return c.json(createErrorResponse("Game name is required"), 400);
    }

    const tournaments = await getUserTournamentsByName(user.id, gameName);
    if (!tournaments || tournaments.length === 0) {
      return c.json(createErrorResponse("No tournaments found"), 404);
    }

    return c.json(
      createSuccessResponse("Tournaments retrieved successfully", {
        tournaments,
      })
    );
  } catch (error) {
    console.error("Error retrieving tournaments:", error);
    return c.json(
      createErrorResponse("Failed to retrieve tournaments", error),
      500
    );
  }
});

// Move the parameterized route after all specific routes
tournamentApi.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const tournamentId = c.req.param("id");
    if (!tournamentId) {
      return c.json(createErrorResponse("Tournament ID is required"), 400);
    }

    const tournament = await getTournamentById(user.id, Number(tournamentId));
    if (!tournament) {
      return c.json(createErrorResponse("Tournament not found"), 404);
    }

    return c.json(
      createSuccessResponse("Tournament retrieved successfully", {
        tournament,
      })
    );
  } catch (error) {
    console.error("Error retrieving tournament:", error);
    return c.json(
      createErrorResponse("Failed to retrieve tournament", error),
      500
    );
  }
});

export default tournamentApi;
