import { db } from "@/config/db";
import { gamesTable } from "@/drizzle/schema";
import { isAdmin } from "@/middleware/auth";
import { ErrorResponses, SuccessResponses } from "@/utils/responses";
import { gameUpdateValidator, gameValidator } from "@/zod/games";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const gamesRouter = new Hono().basePath("/games");

gamesRouter.use("/*", isAdmin);

// Create a new game
gamesRouter.post("/", zValidator("json", gameValidator), async (c) => {
  try {
    const data = await c.req.json();
    const result = await db
      .insert(gamesTable)
      .values({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        thumbnail: data.thumbnail || null,
      })
      .returning({ id: gamesTable.id });

    return c.json(
      SuccessResponses.created("Game created successfully", {
        gameId: result[0].id,
      })
    );
  } catch (error) {
    console.error("Error creating game:", error);
    return c.json(
      {
        message: "Failed to create game",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// Get all games
gamesRouter.get("/", async (c) => {
  try {
    const games = await db.select().from(gamesTable).execute();

    return c.json({ games }, 200);
  } catch (error) {
    console.error("Error fetching games:", error);
    return c.json(
      ErrorResponses.serverError("Failed to fetch games", error),
      500
    );
  }
});

// Get a single game by ID
gamesRouter.get("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));

    if (isNaN(id) || id <= 0) {
      return c.json(ErrorResponses.badRequest("Invalid game ID"), 400);
    }

    const game = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, id))
      .execute();

    if (!game || game.length === 0) {
      return c.json(ErrorResponses.notFound("Game not found"), 404);
    }

    return c.json({ game: game[0] }, 200);
  } catch (error) {
    console.error("Error fetching game:", error);
    return c.json(
      ErrorResponses.serverError("Failed to fetch game", error),
      500
    );
  }
});

// Update a game (changed from PUT to POST)
gamesRouter.post(
  "/update/:id",
  zValidator("json", gameUpdateValidator),
  async (c) => {
    try {
      const id = Number(c.req.param("id"));
      const data = await c.req.json();

      if (isNaN(id) || id <= 0) {
        return c.json(ErrorResponses.badRequest("Invalid game ID"), 400);
      }

      const existingGame = await db
        .select()
        .from(gamesTable)
        .where(eq(gamesTable.id, id))
        .execute();

      if (!existingGame || existingGame.length === 0) {
        return c.json(ErrorResponses.notFound("Game not found"), 404);
      }

      // Update game
      await db
        .update(gamesTable)
        .set({
          name: data.name !== undefined ? data.name : existingGame[0].name,
          description:
            data.description !== undefined
              ? data.description
              : existingGame[0].description,
          icon: data.icon !== undefined ? data.icon : existingGame[0].icon,
          thumbnail:
            data.thumbnail !== undefined
              ? data.thumbnail
              : existingGame[0].thumbnail,
        })
        .where(eq(gamesTable.id, id))
        .execute();

      const updatedGame = await db
        .select()
        .from(gamesTable)
        .where(eq(gamesTable.id, id))
        .execute();

      return c.json(
        SuccessResponses.created("Game updated successfully", {
          game: updatedGame[0],
        }),

        200
      );
    } catch (error) {
      console.error("Error updating game:", error);
      return c.json(
        ErrorResponses.serverError("Failed to update game", error),
        500
      );
    }
  }
);

// Delete a game (changed from DELETE to POST)
gamesRouter.post("/delete/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));

    if (isNaN(id) || id <= 0) {
      return c.json(ErrorResponses.badRequest("Invalid game ID"), 400);
    }

    const existingGame = await db
      .select()
      .from(gamesTable)
      .where(eq(gamesTable.id, id))
      .execute();

    if (!existingGame || existingGame.length === 0) {
      return c.json({ message: "Game not found" }, 404);
    }

    await db.delete(gamesTable).where(eq(gamesTable.id, id)).execute();

    return c.json({ message: "Game deleted successfully" }, 200);
  } catch (error) {
    console.error("Error deleting game:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      return c.json(
        ErrorResponses.badRequest(
          "Cannot delete game as it is being used in tournaments"
        ),
        400
      );
    }
    return c.json(
      ErrorResponses.serverError("Failed to delete game", error),
      500
    );
  }
});

export default gamesRouter;
