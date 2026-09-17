import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Game2048, type Direction } from "./game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(here, "..", "static", "index.html");

export interface GameState {
  grid: number[][];
  score: number;
  won: boolean;
  over: boolean;
}

export function snapshot(game: Game2048): GameState {
  return {
    grid: game.grid.map((row) => [...row]),
    score: game.score,
    won: game.hasWon(),
    over: game.isOver(),
  };
}

export function startServer(port = 8080): import("node:http").Server {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/") {
        const page = await readFile(PAGE_PATH, "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(page);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/state") {
        sendJson(res, 200, snapshot(game));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/move") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }
        const direction = parseDirection(body);
        if (direction === undefined) {
          sendJson(res, 400, { error: "body must be a json object with a valid direction" });
          return;
        }
        game.move(direction);
        sendJson(res, 200, snapshot(game));
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "server error" });
    }
  }).listen(port, () => {
    console.log(`2048 running on http://localhost:${port}`);
  });
  return server;
}

const game = new Game2048();

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

function parseDirection(body: string): Direction | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null && "direction" in parsed) {
      const candidate = (parsed as { direction: unknown }).direction;
      if (typeof candidate === "string" && DIRECTIONS.includes(candidate as Direction)) {
        return candidate as Direction;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}