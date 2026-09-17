import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";
import { LESSONS } from "./lessons.ts";
import { gradeAnswer, runQuiz, totalQuestions, validateLessons } from "./quiz.ts";

const { values } = parseArgs({
  options: {
    answers: { type: "string" },
    "self-check": { type: "boolean", short: "s" },
  },
});

const problems = validateLessons();
if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`content problem: ${problem}`);
  }
  process.exit(2);
}

const fixedAnswers = values.answers
  ?.split(",")
  .map((part) => part.trim())
  .filter((part) => part.length > 0);

async function runInteractive(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  let answered = 0;
  let correct = 0;

  for (const lesson of LESSONS) {
    console.log(`\n== ${lesson.title} ==`);
    for (const question of lesson.questions) {
      const raw = (await rl.question(`${question.prompt} ? `)).trim();
      if (raw.length === 0) {
        continue;
      }
      answered += 1;
      if (gradeAnswer(raw, question)) {
        correct += 1;
        console.log("correct");
      } else {
        console.log(`wrong. accepted: ${question.answers.join(" | ")}`);
      }
    }
  }

  rl.close();
  console.log(`\nanswered ${answered} of ${totalQuestions()} questions`);
  console.log(`correct ${correct}`);
}

async function main(): Promise<void> {
  if (values["self-check"]) {
    const score = runQuiz((question) => question.answers[0]);
    const expected = totalQuestions();
    console.log(`correct ${score.correct} of ${expected}`);
    console.log(score.correct === expected ? "self-check: PASS" : "self-check: FAIL");
    process.exitCode = score.correct === expected ? 0 : 1;
    return;
  }

  if (fixedAnswers) {
    let index = 0;
    const score = runQuiz(() => fixedAnswers[index++]);

    console.log(`answered ${score.answered} of ${totalQuestions()} questions`);
    console.log(`correct ${score.correct}`);
    const failed = score.answered - score.correct;
    console.log(failed === 0 ? "self-check: PASS" : `self-check: FAIL (${failed} wrong)`);
    process.exitCode = failed === 0 ? 0 : 1;
    return;
  }

  await runInteractive();
}

void main();