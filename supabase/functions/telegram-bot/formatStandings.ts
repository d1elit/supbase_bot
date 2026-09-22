import type { Standings } from "./types.ts";

const escapeHtml = (text: unknown): string => String(text)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

export function formatStandings(
  leagueName: string,
  standings: Standings,
): string[] {
  const teamWidth = 15;
  const teamCell = (name: string): string => {
    const chars = Array.from(name.normalize("NFC").replace(/\s+/g, " ").trim());
    const short = chars.length > teamWidth
      ? [...chars.slice(0, teamWidth - 1), "…"]
      : chars;
    return short.join("") + " ".repeat(teamWidth - short.length);
  };

  const rows = standings.table.map((row) => [
    String(row.rank),
    teamCell(row.team.name),
    String(row.all.played),
    String(row.goalsDiff),
    String(row.points),
  ]);
  const labels = ["#", teamCell("Команда"), "И", "РМ", "Оч"];
  const widths = [2, teamWidth, 2, 3, 3].map((width, index) =>
    Math.max(width, ...rows.map((row) => Array.from(row[index]).length))
  );
  const line = (cells: string[]) => cells.map((cell, index) =>
    index === 1 ? cell : cell.padStart(widths[index])
  ).join(" ");

  const heading = `<b>${escapeHtml(leagueName)} — ${standings.season}/${standings.season + 1}</b>`;
  const start = `${heading}\n<pre>${escapeHtml(line(labels))}`;
  const messages: string[] = [];
  let text = start;

  for (const row of rows) {
    const nextLine = `\n${escapeHtml(line(row))}`;
    if (text.length + nextLine.length + "</pre>".length > 4000) {
      messages.push(`${text}</pre>`);
      text = start;
    }
    text += nextLine;
  }

  messages.push(`${text}</pre>`);
  return messages;
}
