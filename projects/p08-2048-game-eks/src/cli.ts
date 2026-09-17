import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { slideLine, Game2048 } from "./game.ts";
import { DEFAULT_K8S, renderManifests, renderApplyNotes } from "./k8s.ts";
import { startServer } from "./server.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    manifests: { type: "boolean", short: "m" },
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

if (values.check || (!values.manifests && !values.serve)) {
  const game = new Game2048(() => 0);
  const problems: string[] = [];
  if (game.grid.flat().filter((v) => v > 0).length !== 2) {
    problems.push("new game must start with two tiles");
  }
  if (slideLine([2, 2, 4, 4]).line.join(",") !== "4,8,0,0") {
    problems.push("slideLine merge is incorrect");
  }
  if (problems.length === 0) {
    console.log("engine: PASS");
    process.exitCode = 0;
  } else {
    for (const p of problems) {
      console.error(`engine: ${p}`);
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
} else {
  writeOrPrint(
    values.out,
    values.out?.endsWith(".json") ? renderManifests(DEFAULT_K8S) : renderManifests(DEFAULT_K8S) + renderApplyNotes(DEFAULT_K8S),
  );
}