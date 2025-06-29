import { db } from "@/config/db";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  historyTable,
  tournamentParticipantsTable,
  tournamentsTable,
  usersTable,
  winningsTable,
} from "../../drizzle/schema";

const sanitizeTournamentData = (
  tournamentData: any,
  hasParticipated: boolean = false,
  isWinner: boolean = false
) => {
  if (!tournamentData) return tournamentData;

  if (hasParticipated || isWinner) return tournamentData;

  if (tournamentData.tournament) {
    const { roomId, roomPassword, ...rest } = tournamentData.tournament;
    return { ...tournamentData, tournament: rest };
  }

  if (
    tournamentData.roomId !== undefined ||
    tournamentData.roomPassword !== undefined
  ) {
    const { roomId, roomPassword, ...sanitizedData } = tournamentData;
    return sanitizedData;
  }

  return tournamentData;
};

export async function getAllUserTournaments(userId: number) {
  try {
    const tournaments = await db
      .select()
      .from(tournamentsTable)
      .leftJoin(
        tournamentParticipantsTable,
        eq(tournamentParticipantsTable.tournamentId, tournamentsTable.id)
      )
      .where(
        and(
          eq(tournamentParticipantsTable.userId, userId),
          eq(tournamentsTable.isEnded, false),
          gt(tournamentsTable.scheduledAt, new Date())
        )
      )
      .orderBy(desc(tournamentsTable.scheduledAt));

    return tournaments.map((tournament) => {
      const { tournaments, ...rest } = tournament;
      return {
        ...rest,
        tournaments: sanitizeTournamentData(tournaments, true),
      };
    });
  } catch (error) {
    console.error("Error fetching all user tournaments:", error);
    throw error;
  }
}

export async function getTournamentById(userId: number, id: number) {
  try {
    if (isNaN(id) || id <= 0) {
      throw new Error("Invalid tournament ID provided");
    }
    const tournament = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id));

    if (!tournament || tournament.length === 0) {
      throw new Error(`Tournament with ID ${id} does not exist`);
    }

    const tournamentData = tournament[0];

    const participation = await db
      .select()
      .from(tournamentParticipantsTable)
      .where(
        and(
          eq(tournamentParticipantsTable.tournamentId, id),
          eq(tournamentParticipantsTable.userId, userId)
        )
      );

    const hasParticipated = participation && participation.length > 0;

    const winnerCheck = await db
      .select()
      .from(winningsTable)
      .where(
        and(
          eq(winningsTable.tournamentId, id),
          eq(winningsTable.userId, userId)
        )
      );

    const isWinner = winnerCheck && winnerCheck.length > 0;

    if (tournamentData.isEnded) {
      const winners = await db
        .select()
        .from(winningsTable)
        .where(eq(winningsTable.tournamentId, id));

      return {
        tournament: sanitizeTournamentData(
          tournamentData,
          hasParticipated,
          isWinner
        ),
        winners,
        hasParticipated,
        isWinner,
      };
    }

    return {
      tournament: sanitizeTournamentData(
        tournamentData,
        hasParticipated,
        isWinner
      ),
      hasParticipated,
      isWinner,
      message: "Tournament is still ongoing",
    };
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    throw error;
  }
}

export async function getUserTournamentsByName(userId: number, game: string) {
  try {
    const tournaments = await db
      .select({
        tournament: tournamentsTable,
      })
      .from(tournamentsTable)
      .leftJoin(
        tournamentParticipantsTable,
        and(
          eq(tournamentParticipantsTable.tournamentId, tournamentsTable.id),
          eq(tournamentParticipantsTable.userId, userId)
        )
      )
      .where(
        and(
          eq(tournamentsTable.game, game),
          eq(tournamentsTable.isEnded, false),
          isNull(tournamentParticipantsTable.id),
          gt(tournamentsTable.scheduledAt, new Date())
        )
      )
      .orderBy(desc(tournamentsTable.scheduledAt));

    return tournaments.map((item) => ({
      tournament: sanitizeTournamentData(item.tournament, false),
    }));
  } catch (error) {
    console.error("Error fetching tournaments by game name:", error);
    throw error;
  }
}

export async function participateInTournament(
  tournamentId: number,
  userId: number,
  playerUsername: string,
  playerUserId: string,
  playerLevel: number
) {
  try {
    // 1. Check tournament exists and is open
    const tournament = await db
      .select()
      .from(tournamentsTable)
      .where(
        and(
          eq(tournamentsTable.id, tournamentId),
          eq(tournamentsTable.isEnded, false),
          gt(tournamentsTable.scheduledAt, new Date())
        )
      );
    if (!tournament || tournament.length === 0) {
      throw new Error(`Tournament does not exist`);
    }

    // 2. Check if user already participated
    const existingParticipant = await db
      .select()
      .from(tournamentParticipantsTable)
      .where(
        and(
          eq(tournamentParticipantsTable.tournamentId, tournamentId),
          eq(tournamentParticipantsTable.userId, userId)
        )
      );
    if (existingParticipant && existingParticipant.length > 0) {
      throw new Error(`Already participated in tournament`);
    }

    // 3. Check max participants
    const maxParticipants = tournament[0].maxParticipants;
    const currentParticipants = await db
      .select()
      .from(tournamentParticipantsTable)
      .where(eq(tournamentParticipantsTable.tournamentId, tournamentId));
    const currentParticipantsCount = currentParticipants.length;
    if (currentParticipantsCount >= maxParticipants) {
      throw new Error(`Tournament has reached its maximum participants`);
    }

    // 4. Check user exists and balance
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user || user.length === 0) {
      throw new Error(`User does not exist`);
    }
    const userBalance = user[0].balance;
    const tournamentEntryFee = tournament[0].entryFee;
    if (userBalance < tournamentEntryFee) {
      throw new Error(
        "Don't have enough balance to participate in this tournament"
      );
    }
    if (playerLevel < 30) {
      throw new Error("Player level must be at least 30");
    }

    // 5. Deduct balance
    await db
      .update(usersTable)
      .set({ balance: userBalance - tournamentEntryFee })
      .where(eq(usersTable.id, userId));

    // 6. Insert history
    await db.insert(historyTable).values({
      userId,
      transactionType: "tournament_entry",
      amount: tournamentEntryFee,
      balanceEffect: "decrease",
      status: "completed",
      message: `Entry fee paid for tournament: ${tournament[0].name}`,
      referenceId: tournamentId,
    });

    // 7. Insert participant
    const participantInsert = await db
      .insert(tournamentParticipantsTable)
      .values({
        tournamentId,
        userId,
        playerUsername,
        playerUserId,
        playerLevel,
      });

    // 8. Update tournament participant count
    await db
      .update(tournamentsTable)
      .set({ currentParticipants: currentParticipantsCount + 1 })
      .where(eq(tournamentsTable.id, tournamentId));

    // 9. Get updated tournament
    const updatedTournament = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, tournamentId));

    return {
      participantInsert,
      tournament: updatedTournament[0],
    };
  } catch (error) {
    console.error("Error participating in tournament:", error);
    throw error;
  }
}

export async function isUserParticipatedInTournament(
  tournamentId: number,
  userId: number
) {
  try {
    const participation = await db
      .select()
      .from(tournamentParticipantsTable)
      .where(
        and(
          eq(tournamentParticipantsTable.tournamentId, tournamentId),
          eq(tournamentParticipantsTable.userId, userId)
        )
      );

    return participation && participation.length > 0;
  } catch (error) {
    console.error("Error checking user participation:", error);
    throw error;
  }
}

export async function getParticipatedTournaments(userId: number) {
  try {
    const tournaments = await db
      .select({
        id: tournamentsTable.id,
        adminId: tournamentsTable.adminId,
        game: tournamentsTable.game,
        name: tournamentsTable.name,
        description: tournamentsTable.description,
        roomId: tournamentsTable.roomId,
        roomPassword: tournamentsTable.roomPassword,
        entryFee: tournamentsTable.entryFee,
        prize: tournamentsTable.prize,
        perKillPrize: tournamentsTable.perKillPrize,
        maxParticipants: tournamentsTable.maxParticipants,
        currentParticipants: tournamentsTable.currentParticipants,
        scheduledAt: tournamentsTable.scheduledAt,
        isEnded: tournamentsTable.isEnded,
        createdAt: tournamentsTable.createdAt,
        updatedAt: tournamentsTable.updatedAt,
      })
      .from(tournamentParticipantsTable)
      .innerJoin(
        tournamentsTable,
        eq(tournamentParticipantsTable.tournamentId, tournamentsTable.id)
      )
      .where(
        and(
          eq(tournamentParticipantsTable.userId, userId),
          eq(tournamentsTable.isEnded, false)
        )
      )
      .orderBy(desc(tournamentsTable.scheduledAt));

    return tournaments;
  } catch (error) {
    console.error("Error fetching participated tournaments:", error);
    throw error;
  }
}

export async function getUserWinnings(userId: number) {
  try {
    const winnings = await db
      .select({
        tournament: tournamentsTable,
        winnings: winningsTable,
      })
      .from(winningsTable)
      .innerJoin(
        tournamentsTable,
        eq(winningsTable.tournamentId, tournamentsTable.id)
      )
      .where(
        and(
          eq(winningsTable.userId, userId),
          eq(tournamentsTable.isEnded, true)
        )
      )
      .orderBy(desc(winningsTable.createdAt));

    return winnings.map((item) => ({
      tournament: sanitizeTournamentData(item.tournament, true, true),
      winnings: item.winnings,
    }));
  } catch (error) {
    console.error("Error fetching user winnings:", error);
    throw error;
  }
}
