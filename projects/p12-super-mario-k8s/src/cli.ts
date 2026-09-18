import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { RunnerGame, simulateFrames } from "./game.ts";
import { renderFrame } from "./render.ts";
import { DEFAULT_K8S, renderApplyNotes, renderManifests } from "./k8s.ts";
import { startServer } from "./server.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    manifests: { type: "boolean", short: "m" },
    sim: { type: "string", short: "s" },
    seed: { type: "string" },
    serve: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

function parseTicks(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) return 60;
  return parsed;
}

function parseSeed(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return DEFAULT_K8S.seed;
  return parsed;
}

if (values.check || (!values.manifests && !values.sim && !values.serve)) {
  const problems: string[] = [];
  const determinism = new RunnerGame({ seed: 3 });
  const against = new RunnerGame({ seed: 3 });
  const before = simulateFrames(determinism, 30).map((frame) => frame.obstacles.length);
  const after = simulateFrames(against, 30).map((frame) => frame.obstacles.length);
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) {
      problems.push("same seed produces different obstacle streams");
      break;
    }
  }
  const noJump = new RunnerGame({ seed: 3 });
  simulateFrames(noJump, 120);
  if (noJump.state.over !== true) {
    problems.push("an unjumped obstacle never ends the run");
  }
  if (problems.length === 0) {
    console.log("engine: PASS (deterministic spawn, collisions)");
    process.exitCode = 0;
  } else {
    for (const problem of problems) {
      console.error(`engine: ${problem}`);
    }
    process.exitCode = 1;
  }
} else if (values.serve) {
  const port = Number(values.serve);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error("--serve expects a valid port number");
    process.exitCode = 1;
  } else {
    startServer(port);
  }
} else if (values.sim) {
  const ticks = parseTicks(values.sim);
  const game = new RunnerGame({ seed: parseSeed(values.seed) });
  simulateFrames(game, ticks);
  writeOrPrint(values.out, renderFrame(game));
} else {
  writeOrPrint(
    values.out,
    values.out?.endsWith(".json") ? renderManifests(DEFAULT_K8S) : renderManifests(DEFAULT_K8S) + renderApplyNotes(DEFAULT_K8S),
  );
}