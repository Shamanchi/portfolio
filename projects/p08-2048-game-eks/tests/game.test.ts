import { test } from "node:test";
import assert from "node:assert/strict";

import { Game2048, slideLine, slideGrid, equalGrids, SIZE } from "../src/game.ts";

test("a new game starts with exactly two tiles", () => {
  const game = new Game2048(() => 0);
  const values = game.grid.flat().filter((v) => v !== 0);
  assert.equal(values.length, 2);
  assert.deepEqual(values, [2, 2]);
});

test("slideLine merges equal neighbours once", () => {
  assert.equal(slideLine([2, 2, 4, 4]).line.join(","), "4,8,0,0");
  assert.equal(slideLine([2, 2, 2, 0]).line.join(","), "4,2,0,0");
  assert.equal(slideLine([0, 2, 0, 2]).line.join(","), "4,0,0,0");
  assert.equal(slideLine([4, 4, 8, 8]).gained, 24);
});

test("slideGrid left compresses rows", () => {
  const grid = [
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [2, 0, 2, 0],
    [1, 1, 1, 1],
  ];
  const moved = slideGrid(grid, "left");
  assert.equal((moved[0] ?? []).join(","), "4,8,0,0");
  assert.equal((moved[2] ?? []).join(","), "4,0,0,0");
  assert.equal((moved[3] ?? []).join(","), "2,2,0,0");
});

test("move spawns a tile and reports change", () => {
  const game = Game2048.fromGrid([
    [0, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const changed = game.move("left");
  assert.equal(changed, true);
  assert.equal(game.grid[0]?.[0], 2);
  assert.equal(game.grid.flat().filter((v) => v !== 0).length, 2);
});

test("a move that changes nothing returns false", () => {
  const grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 64, 2, 4],
    [128, 4, 8, 2],
  ];
  const before = JSON.stringify(grid);
  const game = Game2048.fromGrid(grid);
  const changed = game.move("left");
  assert.equal(changed, false);
  assert.equal(JSON.stringify(game.grid), before);
});

test("win is detected at 2048", () => {
  const grid = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(1));
  if (grid[0]) {
    grid[0][0] = 2048;
  }
  const game = Game2048.fromGrid(grid);
  assert.equal(game.hasWon(), true);
});

test("game over is recognized on a locked board", () => {
  const locked = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  const game = Game2048.fromGrid(locked);
  assert.equal(game.hasMoves(), false);
  assert.equal(game.isOver(), true);
});

test("score accumulates merged tile values", () => {
  const game = Game2048.fromGrid([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  game.move("left");
  assert.equal(game.score, 4);
});

test("equalGrids compares tiles including zeros", () => {
  assert.equal(
    equalGrids(
      [
        [1, 2],
        [3, 4],
      ],
      [
        [1, 2],
        [3, 4],
      ],
    ),
    true,
  );
  assert.equal(
    equalGrids(
      [
        [1, 2],
        [3, 4],
      ],
      [
        [1, 0],
        [3, 4],
      ],
    ),
    false,
  );
});