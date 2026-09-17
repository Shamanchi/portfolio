import { LESSONS, type Question } from "./lessons.ts";

export interface Score {
  answered: number;
  correct: number;
}

export function normalizeAnswer(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function gradeAnswer(input: string | undefined, question: Question): boolean {
  if (input === undefined) {
    return false;
  }
  const candidate = normalizeAnswer(input);
  if (candidate.length === 0) {
    return false;
  }
  return question.answers.some((answer) => candidate === normalizeAnswer(answer));
}

export function runQuiz(
  responder: (question: Question) => string | undefined,
): Score {
  let answered = 0;
  let correct = 0;
  for (const lesson of LESSONS) {
    for (const question of lesson.questions) {
      const answer = responder(question);
      if (answer !== undefined) {
        answered += 1;
      }
      if (gradeAnswer(answer, question)) {
        correct += 1;
      }
    }
  }
  return { answered, correct };
}

export function totalQuestions(): number {
  return LESSONS.reduce((sum, lesson) => sum + lesson.questions.length, 0);
}

export function validateLessons(): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const lesson of LESSONS) {
    if (!lesson.id.trim()) {
      problems.push("lesson with an empty id");
    }
    for (const question of lesson.questions) {
      if (seenIds.has(question.id)) {
        problems.push(`duplicate question id: ${question.id}`);
      }
      seenIds.add(question.id);
      if (!question.prompt.trim()) {
        problems.push(`question ${question.id} has an empty prompt`);
      }
      if (question.answers.length === 0) {
        problems.push(`question ${question.id} has no accepted answers`);
      }
      for (const answer of question.answers) {
        if (!answer.trim()) {
          problems.push(`question ${question.id} has an empty accepted answer`);
        }
      }
    }
  }

  return problems;
}