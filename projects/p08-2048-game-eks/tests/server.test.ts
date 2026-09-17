import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

import { renderManifests, DEFAULT_K8S } from "../src/k8s.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("server answers the state endpoint", async () => {
  const { startServer, snapshot } = await import("../src/server.ts");
  const server = startServer(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;
    assert.ok(port > 0);
    const res = await fetch(`http://localhost:${port}/api/state`);
    assert.equal(res.status, 200);
    const state = await res.json();
    assert.ok(Array.isArray(state.grid));
    assert.equal(state.grid.length, 4);
    assert.equal(state.grid[0]?.length, 4);
    assert.equal(typeof state.score, "number");
  } finally {
    server.close();
  }
  void snapshot;
});

test("server rejects an invalid move body", async () => {
  const { startServer } = await import("../src/server.ts");
  const server = startServer(0);
  try {
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;
    assert.ok(port > 0);
    const res = await fetch(`http://localhost:${port}/api/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: "north" }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test("manifests render Deployment, Service and Ingress", () => {
  const out = renderManifests(DEFAULT_K8S);
  assert.match(out, /"kind": "Deployment"/);
  assert.match(out, /"kind": "Service"/);
  assert.match(out, /"kind": "Ingress"/);
  assert.match(out, /"host": "game\.example\.com"/);
});

test("check CLI reports engine PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /engine: PASS/);
});