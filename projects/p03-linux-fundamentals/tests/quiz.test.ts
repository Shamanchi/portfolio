import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { LESSONS, type Question } from "../src/lessons.ts";
import {
  gradeAnswer,
  normalizeAnswer,
  runQuiz,
  totalQuestions,
  validateLessons,
} from "../src/quiz.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("lessons are well formed", () => {
  const problems = validateLessons();
  assert.deepEqual(problems, []);
});

test("question ids are unique across lessons", () => {
  const ids = LESSONS.flatMap((lesson) => lesson.questions.map((q) => q.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("normalizeAnswer trims, folds case and collapses whitespace", () => {
  assert.equal(normalizeAnswer("  Ls  -A  "), "ls -a");
});

test("gradeAnswer accepts any provided spelling", () => {
  const question: Question = {
    id: "t",
    prompt: "p",
    answers: ["ls -a", "ls -la"],
  };
  assert.equal(gradeAnswer("ls -a", question), true);
  assert.equal(gradeAnswer("  LS -LA ", question), true);
  assert.equal(gradeAnswer("ls", question), false);
  assert.equal(gradeAnswer("", question), false);
  assert.equal(gradeAnswer(undefined, question), false);
});

test("runQuiz counts answered and correct", () => {
  let index = 0;
  const all = LESSONS.flatMap((lesson) => lesson.questions);
  const score = runQuiz(() => {
    const question = all[index];
    index += 1;
    return question === undefined ? undefined : question.answers[0];
  });
  assert.equal(score.answered, totalQuestions());
  assert.equal(score.correct, totalQuestions());
});

test("runQuiz skips unanswered questions", () => {
  const score = runQuiz(() => undefined);
  assert.equal(score.answered, 0);
  assert.equal(score.correct, 0);
});

test("self-check CLI reports PASS for the built-in answer key", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--self-check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /self-check: PASS/);
});

test("CLI with empty answers reports zero answered", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--answers", ""], {
    encoding: "utf8",
  });
  assert.match(stdout, /answered 0 of /);
});