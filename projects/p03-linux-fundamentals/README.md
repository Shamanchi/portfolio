# p03-linux-fundamentals

Linux fundamentals practice: a self-contained lesson set with a self-checked
quiz and a lab command reference. The quiz runs anywhere with Node.js,
including Windows, so you can start training without a Linux box. The lab
reference below teaches the same topics on a real machine.

Topic note: inspired by DevOps-Projects (project-03-linux-fundamentals, MIT,
DevCloudNinjas). The implementation and the lesson content here are original.

## Topics covered

- Filesystem: hierarchy, key directories, navigation, hidden files.
- Permissions: octal modes, chmod, chown.
- Text processing and pipes: grep, head, wc, uniq, the pipe operator.
- Processes: ps, signal numbers (15, 9), background execution.
- Shell basics: PATH, &&, executable scripts, man pages.

## Layout

- src/lessons.ts — lessons and accepted answers.
- src/quiz.ts — normalization, grading, score, lesson validation.
- src/cli.ts — interactive quiz and self-check modes.
- tests/quiz.test.ts — content validity and grading tests.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Run the built-in self-check (uses the full answer key):

npm run self-check

Run the interactive quiz:

npm run cli

Check a partial answer list (comma separated, in lesson order):

npm run cli -- --answers "/bin,/etc,proc"

## Lab on a real Linux machine

When you have access to a Linux shell (machine, VM or WSL), run through the
following to practice the same topics:

- pwd; ls -la; cd /etc; cat /etc/os-release
- chmod 750 file; ls -l file; chown user:group file
- ps aux | head -20; grep -rn listen /etc | head
- wc -l /etc/passwd; sort file | uniq
- kill -l (lists signal numbers); kill 15 some-pid; kill -9 stubborn-pid
- echo $PATH; which bash; man ls; history | tail

Try to answer the quiz prompts from memory first, then confirm each command on
the real shell before checking the accepted answers in src/lessons.ts.