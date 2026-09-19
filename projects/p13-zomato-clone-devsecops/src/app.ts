import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MENU, placeOrder } from "./catalog.ts";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(here, "..", "static", "index.html");

export interface CatalogSnapshot {
  items: typeof MENU;
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
      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { status: "ok" });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/menu") {
        sendJson(res, 200, { items: MENU });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/order") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }
        const parsed = parseOrder(body);
        if (parsed === undefined) {
          sendJson(res, 400, { error: "body must be a json object with an order array" });
          return;
        }
        const result = placeOrder(parsed);
        if (!result.ok) {
          sendJson(res, 409, { error: result.problem });
          return;
        }
        sendJson(res, 200, { total: result.total });
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "server error" });
    }
  }).listen(port, () => {
    console.log(`food catalog running on http://localhost:${port}`);
  });
  return server;
}

function parseOrder(body: string): { id: string; quantity: number }[] | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== "object" || parsed === null || !("order" in parsed)) return undefined;
    const order = (parsed as { order: unknown }).order;
    if (!Array.isArray(order)) return undefined;
    const lines = order.filter(
      (entry): entry is { id: string; quantity: number } =>
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        "quantity" in entry &&
        typeof (entry as { id: unknown }).id === "string" &&
        typeof (entry as { quantity: unknown }).quantity === "number",
    );
    return lines;
  } catch {
    return undefined;
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}