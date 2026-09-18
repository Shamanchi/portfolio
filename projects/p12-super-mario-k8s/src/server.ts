import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RunnerGame, autoJumpPolicy, simulateFrames } from "./game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(here, "..", "static", "index.html");

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
      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { status: "ok" });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/sim") {
        const frames = clampInt(url.searchParams.get("frames"), 60, 1, 300);
        const seed = clampInt(url.searchParams.get("seed"), 7, 0, 100000);
        const game = new RunnerGame({ seed });
        const states = simulateFrames(game, frames, autoJumpPolicy);
        sendJson(res, 200, {
          seed,
          frames: states,
        });
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "server error" });
    }
  }).listen(port, () => {
    console.log(`runner game running on http://localhost:${port}`);
  });
  return server;
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}