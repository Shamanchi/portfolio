import { PLAYER_HEIGHT, PLAYER_X, PLAYER_WIDTH, SCREEN_WIDTH, type RunnerGame } from "./game.ts";

export const SCREEN_HEIGHT = 12;

export function renderFrame(game: RunnerGame): string {
  const state = game.state;
  const rows: string[][] = [];

  for (let row = 0; row < SCREEN_HEIGHT; row += 1) {
    rows.push(Array<string>(SCREEN_WIDTH).fill("."));
  }

  const groundRow = SCREEN_HEIGHT - 1;
  for (let col = 0; col < SCREEN_WIDTH; col += 1) {
    rows[groundRow]![col] = "=";
  }

  for (const obstacle of state.obstacles) {
    if (obstacle.x + obstacle.width < 0 || obstacle.x >= SCREEN_WIDTH) continue;
    const char = obstacle.height > 1 ? "|" : "#";
    const startCol = Math.max(0, Math.floor(obstacle.x));
    const endCol = Math.min(SCREEN_WIDTH, obstacle.x + obstacle.width);
    for (let col = startCol; col < endCol; col += 1) {
      for (let heightIndex = 0; heightIndex < obstacle.height; heightIndex += 1) {
        const row = groundRow - 1 - heightIndex;
        if (row >= 0) rows[row]![col] = char;
      }
    }
  }

  const playerBottomRow = groundRow - 1 - Math.round(state.player.y);
  for (let heightIndex = 0; heightIndex < PLAYER_HEIGHT; heightIndex += 1) {
    const row = playerBottomRow - heightIndex;
    if (row >= 0) {
      for (let col = PLAYER_X; col < PLAYER_X + PLAYER_WIDTH; col += 1) {
        if (col < SCREEN_WIDTH) rows[row]![col] = "M";
      }
    }
  }

  const body = rows.map((line) => line.join("")).join("\n");
  return `score: ${state.score}  frame: ${state.frame}  over: ${state.over}\n${body}`;
}