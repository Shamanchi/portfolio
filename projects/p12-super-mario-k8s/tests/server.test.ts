import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { execFileSync } from "node:child_process";
import { get } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { startServer } from "../src/server.ts";
import { DEFAULT_K8S, renderApplyNotes, renderManifests } from "../src/k8s.ts";
import { renderFrame } from "../src/render.ts";
import { RunnerGame, simulateFrames } from "../src/game.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function fetchJson(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
  });
}

test("server serves the page, health and a simulation", async () => {
  const server = startServer(0);
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;

    const page = await fetchJson(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.body, /runner game/);

    const health = await fetchJson(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.match(health.body, /"status":"ok"/);

    const sim = await fetchJson(`${base}/api/sim?frames=5&seed=7`);
    assert.equal(sim.status, 200);
    const parsed = JSON.parse(sim.body) as { frames: unknown[] };
    assert.equal(parsed.frames.length, 5);
  } finally {
    server.close();
  }
});

test("renderer draws a deterministic frame", () => {
  const game = new RunnerGame({ seed: 7 });
  simulateFrames(game, 40);
  const first = renderFrame(game);
  assert.match(first, /score:/);
  assert.ok(first.includes("M"));
  assert.ok(first.includes("="));
  const again = new RunnerGame({ seed: 7 });
  simulateFrames(again, 40);
  assert.equal(first, renderFrame(again));
});

test("manifests cover the delivery pieces and carry no secrets", () => {
  const manifests = renderManifests(DEFAULT_K8S);
  assert.match(manifests, /kind: Deployment/);
  assert.match(manifests, /kind: Service/);
  assert.match(manifests, /kind: HorizontalPodAutoscaler/);
  assert.match(manifests, /kind: ConfigMap/);
  assert.match(manifests, /ghcr.io\/shamanchi\/runner-game/);
  assert.doesNotMatch(manifests, /password|token\s*:/i);
  assert.equal(renderManifests(DEFAULT_K8S), manifests);
});

test("apply notes name the preview command", () => {
  assert.match(renderApplyNotes(DEFAULT_K8S), /port-forward/);
  assert.match(renderApplyNotes(DEFAULT_K8S), /kubectl apply/);
});

test("check CLI reports engine PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /engine: PASS/);
});