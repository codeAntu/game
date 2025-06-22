import {
  awardKillMoney,
  createTournament,
  deleteTournament,
  editTournament,
  endTournament,
  getMyCurrentTournaments,
  getMyTournamentById,
  getMyTournamentHistory,
  getMyTournaments,
  getTournamentParticipants,
  updateTournamentRoomId,
} from "@/helpers/admin/tournaments";
import { isAdmin } from "@/middleware/auth";
import { getAdmin } from "@/utils/context";
import { createErrorResponse, createSuccessResponse } from "@/utils/responses";
import {
  killMoneyValidation,
  tournamentEditValidation,
  tournamentsValidation,
  tournamentUpdateValidation,
} from "@/zod/tournaments";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const tournamentApi = new Hono().basePath("/tournaments");

tournamentApi.use("/*", isAdmin);

tournamentApi.get("/", async (c) => {
  try {
    const admin = getAdmin(c);
    const tournaments = await getMyTournaments(admin.id);
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

tournamentApi.get("/history", async (c) => {
  try {
    const admin = getAdmin(c);
    const tournaments = await getMyTournamentHistory(admin.id);
    return c.json(
      createSuccessResponse("Tournament history retrieved successfully", {
        tournaments,
      })
    );
  } catch (error: unknown) {
    console.error("Error retrieving tournaments:", error);
    return c.json(
      createErrorResponse("Failed to retrieve tournament history", error),
      500
    );
  }
});

tournamentApi.get("/current", async (c) => {
  try {
    const admin = getAdmin(c);
    const tournaments = await getMyCurrentTournaments(admin.id);
    return c.json(
      createSuccessResponse("Current tournaments retrieved successfully", {
        tournaments,
      })
    );
  } catch (error: unknown) {
    console.error("Error retrieving current tournaments:", error);
    return c.json(
      createErrorResponse("Failed to retrieve current tournaments", error),
      500
    );
  }
});

tournamentApi.get("/:id", async (c) => {
  try {
    const admin = getAdmin(c);
    const id = Number(c.req.param("id"));
    console.log(`Admin ${admin.id} accessing tournament ${id}`);

    const tournament = await getMyTournamentById(admin.id, id);
    return c.json(
      createSuccessResponse("Tournament retrieved successfully", {
        tournament,
      })
    );
  } catch (error: unknown) {
    console.error("Error retrieving tournament:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve tournament";

    if (errorMessage.includes("not found")) {
      return c.json(createErrorResponse("Tournament not found"), 404);
    }
    return c.json(
      createErrorResponse("Failed to retrieve tournament", error),
      500
    );
  }
});

tournamentApi.post("/create", async (c) => {
  try {
    const admin = getAdmin(c);
    const body = await c.req.parseBody();

    const processedData = {
      game: body.game,
      name: body.name,
      description: body.description,
      image: body.image,
      roomId: body.roomId || "0",
      roomPassword: body.roomPassword,
      entryFee: Number(body.entryFee),
      prize: Number(body.prize),
      perKillPrize: Number(body.perKillPrize),
      maxParticipants: Number(body.maxParticipants),
      scheduledAt: body.scheduledAt,
    };

    console.log("Processing data for validation:", processedData);

    const data = tournamentsValidation.safeParse(processedData);
    if (!data.success) {
      console.error("Validation error:", data.error.format());
      return c.json(
        createErrorResponse("Invalid tournament data", {
          details: data.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        }),
        400
      );
    }

    const parsedData = data.data;
    console.log("Parsed data:", parsedData);

    const tournamentId = await createTournament(admin.id, parsedData);
    const tournament = await getMyTournamentById(admin.id, tournamentId);

    return c.json(
      createSuccessResponse("Tournament created successfully", {
        tournament,
      })
    );
  } catch (error: unknown) {
    console.error("Error creating tournament:", error);
    return c.json(
      createErrorResponse("Failed to create tournament", error),
      500
    );
  }
});

tournamentApi.post(
  "/update/:id",
  zValidator("json", tournamentUpdateValidation),
  async (c) => {
    try {
      const admin = getAdmin(c);
      const id = Number(c.req.param("id"));
      const data = await c.req.json();
      const result = await updateTournamentRoomId(admin.id, id, data);
      return c.json(
        createSuccessResponse("Tournament updated successfully", {
          tournament: result,
        })
      );
    } catch (error: unknown) {
      console.error("Error updating tournament:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update tournament";

      if (errorMessage.includes("not found")) {
        return c.json(createErrorResponse("Tournament not found"), 404);
      }
      return c.json(
        createErrorResponse("Failed to update tournament", error),
        500
      );
    }
  }
);

tournamentApi.post(
  "/edit/:id",
  zValidator("json", tournamentEditValidation),
  async (c) => {
    try {
      const admin = getAdmin(c);
      const id = Number(c.req.param("id"));
      const data = await c.req.json();
      const updatedTournament = await editTournament(admin.id, id, data);

      return c.json(
        createSuccessResponse("Tournament edited successfully", {
          tournament: updatedTournament,
        })
      );
    } catch (error: unknown) {
      console.error("Error editing tournament:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to edit tournament";

      if (errorMessage.includes("max participants")) {
        return c.json(createErrorResponse(errorMessage), 400);
      }

      if (errorMessage.includes("already ended")) {
        return c.json(createErrorResponse(errorMessage), 400);
      }

      if (errorMessage.includes("not found")) {
        return c.json(createErrorResponse("Tournament not found"), 404);
      }

      return c.json(
        createErrorResponse("Failed to edit tournament", error),
        500
      );
    }
  }
);

tournamentApi.post("/end/:id", async (c) => {
  try {
    const admin = getAdmin(c);
    const id = Number(c.req.param("id"));
    const { winnerId } = await c.req.json();
    const tournament = await endTournament(admin.id, id, winnerId);
    return c.json(
      createSuccessResponse("Tournament ended successfully", {
        tournament,
      })
    );
  } catch (error: unknown) {
    console.error("Error ending tournament:", error);
    return c.json(createErrorResponse("Failed to end tournament", error), 500);
  }
});

tournamentApi.post(
  "/kills/:id",
  zValidator("json", killMoneyValidation),
  async (c) => {
    try {
      const admin = getAdmin(c);
      const id = Number(c.req.param("id"));
      const { userId, kills } = await c.req.json();
      const result = await awardKillMoney(admin.id, id, userId, kills);

      return c.json(
        createSuccessResponse("Kill money awarded successfully", {
          result,
        })
      );
    } catch (error: unknown) {
      console.error("Error awarding kill money:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to award kill money";

      if (errorMessage.includes("not found")) {
        return c.json(createErrorResponse("Tournament not found"), 404);
      }
      return c.json(
        createErrorResponse("Failed to award kill money", error),
        500
      );
    }
  }
);

tournamentApi.get("/participants/:id", async (c) => {
  try {
    const admin = getAdmin(c);
    const id = Number(c.req.param("id"));
    console.log(`Admin ${admin.id} accessing tournament ${id}`);
    const tournamentParticipants = await getTournamentParticipants(
      admin.id,
      id
    );

    return c.json(
      createSuccessResponse("Tournament participants retrieved successfully", {
        participants: tournamentParticipants,
      })
    );
  } catch (error: unknown) {
    console.error("Error retrieving tournament participants:", error);
    return c.json(
      createErrorResponse("Failed to retrieve tournament participants", error),
      500
    );
  }
});

tournamentApi.post("/delete/:id", async (c) => {
  try {
    const admin = getAdmin(c);
    const id = Number(c.req.param("id"));
    const result = await deleteTournament(admin.id, id);

    return c.json(
      createSuccessResponse("Tournament deleted successfully", {
        result,
      })
    );
  } catch (error: unknown) {
    console.error("Error deleting tournament:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete tournament";

    if (errorMessage.includes("participants")) {
      return c.json(createErrorResponse(errorMessage), 400);
    }

    if (errorMessage.includes("not found")) {
      return c.json(createErrorResponse("Tournament not found"), 404);
    }

    return c.json(
      createErrorResponse("Failed to delete tournament", error),
      500
    );
  }
});

export default tournamentApi;
