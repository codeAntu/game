import {
  createErrorResponse,
  createSuccessResponse
} from "@/utils/responses";
import { Hono } from "hono";

const game = new Hono().basePath("/game");

game.get("/all", async (c) => {
  try {
    const games = [
      {
        id: 1,
        name: "BGMI",
        description: "PlayerUnknown's Battlegrounds",
        image: "/games/BGMI/image.png",
        iconUrl: "/games/BGMI/icon.png",
      },
      {
        id: 2,
        name: "FREEFIRE",
        description: "Garena Free Fire",
        image: "/games/FREEFIRE/image.png",
        iconUrl: "/games/FREEFIRE/icon.png",
      },
    ];

    return c.json(
      createSuccessResponse("Games retrieved successfully", {
        games,
      }),
      200
    );
  } catch (error: unknown) {
    console.error("Error retrieving games:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve games";
    return c.json(createErrorResponse(errorMessage), 500);
  }
});

export default game;
