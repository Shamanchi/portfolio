export interface GameConfig {
  seed: number;
  speed: number;
  gravity: number;
  jumpVelocity: number;
  minSpawnGap: number;
  maxSpawnGap: number;
}

export interface PlayerState {
  y: number;
  vy: number;
}

export interface Obstacle {
  x: number;
  width: number;
  height: number;
}

export interface GameState {
  frame: number;
  score: number;
  over: boolean;
  player: PlayerState;
  obstacles: Obstacle[];
}

export const DEFAULT_CONFIG: GameConfig = {
  seed: 7,
  speed: 2,
  gravity: 2,
  jumpVelocity: 10,
  minSpawnGap: 10,
  maxSpawnGap: 16,
};

export const PLAYER_X = 4;
export const PLAYER_WIDTH = 2;
export const PLAYER_HEIGHT = 2;
export const SCREEN_WIDTH = 48;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RunnerGame {
  readonly config: GameConfig;
  readonly state: GameState;
  private pendingGap: number;
  private rand: () => number;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rand = mulberry32(this.config.seed);
    this.pendingGap = this.nextGap();
    this.state = { frame: 0, score: 0, over: false, player: { y: 0, vy: 0 }, obstacles: [] };
  }

  private nextGap(): number {
    const span = Math.max(1, this.config.maxSpawnGap - this.config.minSpawnGap + 1);
    return this.config.minSpawnGap + Math.floor(this.rand() * span);
  }

  tick(action: "jump" | "none" = "none"): GameState {
    const state = this.state;
    if (state.over) return state;

    if (action === "jump" && state.player.y === 0) {
      state.player.vy = this.config.jumpVelocity;
    }

    state.player.vy -= this.config.gravity;
    state.player.y += state.player.vy;
    if (state.player.y <= 0) {
      state.player.y = 0;
      state.player.vy = 0;
    }

    for (const obstacle of state.obstacles) {
      obstacle.x -= this.config.speed;
    }
    const before = state.obstacles.length;
    state.obstacles = state.obstacles.filter((obstacle) => !(obstacle.x + obstacle.width < 0));
    state.score += before - state.obstacles.length;

    if (state.obstacles.every((obstacle) => obstacle.x > SCREEN_WIDTH / 2) && this.pendingGap <= 0) {
      const rand = this.rand();
      state.obstacles.push({
        x: SCREEN_WIDTH,
        width: 2,
        height: rand < 0.5 ? 2 : 1,
      });
      this.pendingGap = this.nextGap();
    } else {
      this.pendingGap -= 1;
    }

    for (const obstacle of state.obstacles) {
      if (collides(state.player, obstacle)) {
        state.over = true;
        break;
      }
    }

    state.frame += 1;
    return state;
  }
}

export function collides(player: PlayerState, obstacle: Obstacle): boolean {
  const horizontal = PLAYER_X + PLAYER_WIDTH > obstacle.x && obstacle.x + obstacle.width > PLAYER_X;
  const vertical = player.y < obstacle.height;
  return horizontal && vertical;
}

export function snapshot(game: RunnerGame): GameState {
  return {
    frame: game.state.frame,
    score: game.state.score,
    over: game.state.over,
    player: { ...game.state.player },
    obstacles: game.state.obstacles.map((obstacle) => ({ ...obstacle })),
  };
}

export function autoJumpPolicy(game: RunnerGame): "jump" | "none" {
  const state = game.state;
  const danger = state.obstacles.some(
    (obstacle) => obstacle.x - (PLAYER_X + PLAYER_WIDTH) <= 8 && obstacle.x >= PLAYER_X,
  );
  return state.player.y === 0 && danger ? "jump" : "none";
}

export function simulateFrames(
  game: RunnerGame,
  ticks: number,
  policy: (game: RunnerGame) => "jump" | "none" = () => "none",
): GameState[] {
  const frames: GameState[] = [];
  for (let i = 0; i < ticks; i += 1) {
    game.tick(policy(game));
    frames.push(snapshot(game));
  }
  return frames;
}