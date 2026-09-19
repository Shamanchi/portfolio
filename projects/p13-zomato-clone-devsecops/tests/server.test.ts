import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { get, request } from "node:http";

import { startServer } from "../src/app.ts";

function fetchText(url: string, options: { method?: string; body?: string } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: options.method ?? "GET", headers: options.body ? { "content-type": "application/json" } : undefined },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

test("server serves page, health, menu and orders", async () => {
  const server = startServer(0);
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;

    const page = await fetchText(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.body, /food catalog demo/);

    const health = await fetchText(`${base}/api/health`);
    assert.match(health.body, /"status":"ok"/);

    const menu = await fetchText(`${base}/api/menu`);
    assert.match(menu.body, /chicken-biryani/);

    const order = await fetchText(`${base}/api/order`, {
      method: "POST",
      body: JSON.stringify({ order: [{ id: "chicken-biryani", quantity: 2 }] }),
    });
    assert.equal(order.status, 200);
    assert.match(order.body, /"total":24/);

    const oversell = await fetchText(`${base}/api/order`, {
      method: "POST",
      body: JSON.stringify({ order: [{ id: "veg-thali", quantity: 1 }] }),
    });
    assert.equal(oversell.status, 409);
    assert.match(oversell.body, /stock/);

    const missing = await fetchText(`${base}/nope`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});