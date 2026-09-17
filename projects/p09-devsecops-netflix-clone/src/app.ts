import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defaultStore, filterByGenre, topRated } from "./catalog.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(here, "..", "static", "index.html");

export function startAppServer(port = 8080): import("node:http").Server {
  const store = defaultStore();
  return createServer(async (req, res) => {
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
      if (req.method === "GET" && url.pathname === "/api/catalog") {
        const genre = url.searchParams.get("genre") ?? "";
        sendJson(res, 200, { items: filterByGenre(store, genre) });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/top") {
        const raw = Number(url.searchParams.get("count") ?? "3");
        const count = Number.isInteger(raw) && raw >= 0 ? raw : 3;
        sendJson(res, 200, { items: topRated(store, count) });
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "server error",
      });
    }
  }).listen(port, () => {
    console.log(`watch catalog running on http://localhost:${port}`);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}