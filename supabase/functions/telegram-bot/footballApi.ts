import type { Standings } from "./types.ts";

const BASE_URL = "https://api.football-data.org/v4/";

const competitionCodes = new Map<string, string>([
  ["premier-league", "PL"],
  ["la-liga", "PD"],
  ["bundesliga", "BL1"],
  ["serie-a", "SA"],
  ["ligue-1", "FL1"],
]);

interface FootballDataResponse {
  message?: string;
  errorCode?: number;
  season?: { startDate?: string };
  standings?: Array<{
    type: string;
    table?: Array<{
      position: number;
      team: { name: string };
      playedGames: number;
      goalDifference: number;
      points: number;
    }>;
  }>;
}

export async function getStandings(
  leagueId: string,
  apiKey: string,
): Promise<Standings | null> {
  const code = competitionCodes.get(leagueId);
  if (!code) throw new Error("Unknown league.");
  if (!apiKey) throw new Error("Missing FOOTBALL_DATA_API_KEY.");

  const response = await fetch(
    new URL(`competitions/${code}/standings`, BASE_URL),
    {
      headers: { "X-Auth-Token": apiKey },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "[Unable to read body]");
    console.error("Football API request failed", response.status, body);
    throw new Error(`Football API HTTP error: ${response.status}`);
  }

  const data = await response.json() as FootballDataResponse;
  if (data.errorCode || data.message || !Array.isArray(data.standings)) {
    throw new Error("Football API returned an invalid response.");
  }

  const table = data.standings.find((item) => item.type === "TOTAL")?.table;
  if (!table?.length) return null;

  const startDate = data.season?.startDate;
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("Football API response has no valid season.");
  }

  return {
    season: Number(startDate.slice(0, 4)),
    table: table.map((row) => ({
      rank: row.position,
      team: { name: row.team.name },
      all: { played: row.playedGames },
      goalsDiff: row.goalDifference,
      points: row.points,
    })).sort((a, b) => a.rank - b.rank),
  };
}
