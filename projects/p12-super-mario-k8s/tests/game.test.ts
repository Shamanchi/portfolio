import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONFIG,
  RunnerGame,
  autoJumpPolicy,
  collides,
  simulateFrames,
  snapshot,
} from "../src/game.ts";

test("same seed produces an identical obstacle stream", () => {
  const stream = (seed: number, ticks: number): number[] => {
    const game = new RunnerGame({ seed });
    return simulateFrames(game, ticks).map((frame) => frame.obstacles.length);
  };
  assert.deepEqual(stream(7, 40), stream(7, 40));
  assert.ok(stream(7, 40).some((count) => count > 0));
});

test("different seeds diverge", () => {
  const counts = (seed: number): string => simulateFrames(new RunnerGame({ seed }), 40).map((f) => f.obstacles.length).join(",");
  assert.notEqual(counts(7), counts(8));
});

test("a jump rises and returns to the ground", () => {
  const game = new RunnerGame({ seed: 1 });
  let apex = 0;
  for (let i = 0; i < 40; i += 1) {
    game.tick(i === 0 ? "jump" : "none");
    apex = Math.max(apex, game.state.player.y);
  }
  assert.ok(apex > 0, "the player must leave the ground");
  assert.equal(game.state.player.y, 0);
  assert.equal(game.state.player.vy, 0);
});

test("collision depends on height as well as position", () => {
  const obstacle = { x: 4, width: 2, height: 2 };
  assert.equal(collides({ y: 0, vy: 0 }, obstacle), true);
  assert.equal(collides({ y: 1, vy: 0 }, obstacle), true);
  assert.equal(collides({ y: 2, vy: 0 }, obstacle), false);
  assert.equal(collides({ y: 0, vy: 0 }, { x: 20, width: 2, height: 2 }), false);
});

test("running without jumps ends the run", () => {
  const game = new RunnerGame({ seed: 3 });
  simulateFrames(game, 140);
  assert.equal(game.state.over, true);
});

test("the auto-jump bot clears obstacles", () => {
  const game = new RunnerGame({ seed: 3 });
  simulateFrames(game, 300, autoJumpPolicy);
  assert.equal(game.state.over, false);
  assert.ok(game.state.score >= 3);
});

test("obstacles that pass the player add score", () => {
  const game = new RunnerGame({ seed: 3 });
  simulateFrames(game, 300, autoJumpPolicy);
  const last = snapshot(game);
  assert.ok(last.score >= 1);
  assert.ok(last.frame === 300);
});

test("config defaults are sane", () => {
  assert.ok(DEFAULT_CONFIG.jumpVelocity > DEFAULT_CONFIG.gravity);
  assert.ok(DEFAULT_CONFIG.minSpawnGap > 0);
  assert.ok(DEFAULT_CONFIG.maxSpawnGap >= DEFAULT_CONFIG.minSpawnGap);
});