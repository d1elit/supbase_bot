export const leagues = new Map<string, string>([
  ["premier-league", "Premier League"],
  ["la-liga", "La Liga"],
  ["bundesliga", "Bundesliga"],
  ["serie-a", "Serie A"],
  ["ligue-1", "Ligue 1"],
]);

const leagueNames = new Map<string, string>([
  ...Array.from(leagues, ([id, name]) => [name.toLowerCase(), id] as const),
  ["ла лига", "la-liga"],
  ["epl", "premier-league"],
  ["апл", "premier-league"],
  ["бундеслига", "bundesliga"],
  ["серия а", "serie-a"],
  ["лига 1", "ligue-1"],
]);

export function resolveLeagueId(text: string): string | undefined {
  const name = text.trim().toLowerCase().replace(/\s+/g, " ");
  return leagueNames.get(name);
}
