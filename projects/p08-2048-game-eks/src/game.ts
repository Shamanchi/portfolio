export type Direction = "left" | "right" | "up" | "down";

export type RandomSource = () => number;

export const SIZE = 4;
export const WIN_TILE = 2048;

function get(grid: number[][], row: number, col: number): number {
  return grid[row]?.[col] ?? 0;
}

function set(grid: number[][], row: number, col: number, value: number): void {
  const targetRow = grid[row];
  if (targetRow) {
    targetRow[col] = value;
  }
}

export class Game2048 {
  readonly grid: number[][];
  score: number;
  private readonly random: RandomSource;

  constructor(random: RandomSource = Math.random) {
    this.random = random;
    this.grid = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
    this.score = 0;
    this.spawnTile();
    this.spawnTile();
  }

  static fromGrid(grid: number[][], score = 0): Game2048 {
    const rows = grid.slice(0, SIZE).map((row) => row.slice(0, SIZE));
    const game = new Game2048(() => 0);
    game.score = score;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        set(game.grid, row, col, rows[row]?.[col] ?? 0);
      }
    }
    return game;
  }

  hasWon(): boolean {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (get(this.grid, row, col) === WIN_TILE) {
          return true;
        }
      }
    }
    return false;
  }

  hasMoves(): boolean {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = get(this.grid, row, col);
        if (value === 0) {
          return true;
        }
        for (const [dr, dc] of DIRS) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && get(this.grid, nr, nc) === value) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isOver(): boolean {
    return !this.hasMoves() && !this.hasWon();
  }

  move(direction: Direction): boolean {
    const movedGrid = slideGrid(this.grid, direction);
    const changed = !equalGrids(this.grid, movedGrid);
    if (!changed) {
      return false;
    }
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const before = get(this.grid, row, col);
        const after = get(movedGrid, row, col);
        if (after > before) {
          this.score += after;
        }
      }
    }
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        set(this.grid, row, col, get(movedGrid, row, col));
      }
    }
    this.spawnTile();
    return true;
  }

  private spawnTile(): void {
    const empty: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (get(this.grid, row, col) === 0) {
          empty.push({ row, col });
        }
      }
    }
    if (empty.length === 0) {
      return;
    }
    const slot = empty[Math.floor(this.random() * empty.length)];
    if (slot) {
      set(this.grid, slot.row, slot.col, this.random() < 0.9 ? 2 : 4);
    }
  }
}

const DIRS: ReadonlyArray<Readonly<[number, number]>> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function slideLine(line: number[]): { line: number[]; gained: number } {
  const tiles = line.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    const current = tiles[i];
    const next = tiles[i + 1];
    if (current !== undefined && current === next) {
      result.push(current * 2);
      gained += current * 2;
      i += 1;
    } else if (current !== undefined) {
      result.push(current);
    }
  }
  while (result.length < line.length) {
    result.push(0);
  }
  return { line: result, gained };
}

export function slideGrid(grid: number[][], direction: Direction): number[][] {
  const result = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (let i = 0; i < SIZE; i++) {
    const source: number[] = [];
    for (let k = 0; k < SIZE; k++) {
      let value: number | undefined;
      if (direction === "left") {
        value = grid[i]?.[k];
      } else if (direction === "right") {
        value = grid[i]?.[SIZE - 1 - k];
      } else if (direction === "up") {
        value = grid[k]?.[i];
      } else {
        value = grid[SIZE - 1 - k]?.[i];
      }
      source.push(value ?? 0);
    }
    const { line } = slideLine(source);
    for (let k = 0; k < SIZE; k++) {
      const tile = line[k] ?? 0;
      if (direction === "left") {
        set(result, i, k, tile);
      } else if (direction === "right") {
        set(result, i, SIZE - 1 - k, tile);
      } else if (direction === "up") {
        set(result, k, i, tile);
      } else {
        set(result, SIZE - 1 - k, i, tile);
      }
    }
  }
  return result;
}

export function equalGrids(a: number[][], b: number[][]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (get(a, row, col) !== get(b, row, col)) {
        return false;
      }
    }
  }
  return true;
}