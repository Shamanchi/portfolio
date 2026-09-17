export interface Question {
  id: string;
  prompt: string;
  answers: string[];
  hint?: string;
}

export interface Lesson {
  id: string;
  title: string;
  questions: Question[];
}

export const LESSONS: Lesson[] = [
  {
    id: "filesystem",
    title: "Filesystem",
    questions: [
      {
        id: "fs-1",
        prompt: "Top-level directory that contains the command binaries",
        answers: ["/bin", "bin"],
        hint: "Single-word answer starting with a slash.",
      },
      {
        id: "fs-2",
        prompt: "Directory that holds configuration files",
        answers: ["/etc", "etc"],
        hint: "Configuration lives here; the aux suffix is the giveaway.",
      },
      {
        id: "fs-3",
        prompt: "Directory that contains detailed information about running processes",
        answers: ["/proc", "proc"],
        hint: "A virtual filesystem, process list baked into the kernel.",
      },
      {
        id: "fs-4",
        prompt: "Command that prints the current working directory",
        answers: ["pwd", "print working directory"],
        hint: "The short form is three lowercase letters.",
      },
      {
        id: "fs-5",
        prompt: "Command to show everything including hidden files in the current directory",
        answers: ["ls -a", "ls -la", "ls -al", "ls -A", "ls -Al", "ls -lA", "ls -a -l"],
        hint: "You need the 'all' flag.",
      },
    ],
  },
  {
    id: "permissions",
    title: "Permissions",
    questions: [
      {
        id: "pm-1",
        prompt: "Octal value of read-only permission for the owner (rw-)",
        answers: ["4", "400", "0400"],
        hint: "Read maps to 4 in the octal notation.",
      },
      {
        id: "pm-2",
        prompt: "Octal value that gives rwxr-x--- to the file",
        answers: ["750", "0750"],
        hint: "Owner rwx, group r-x, others ---.",
      },
      {
        id: "pm-3",
        prompt: "Command to change file ownership",
        answers: ["chown"],
        hint: "change + owner.",
      },
      {
        id: "pm-4",
        prompt: "The three letters describing permissions in alphabetical order",
        answers: ["rwx", "read write execute"],
        hint: "Read, write, execute.",
      },
    ],
  },
  {
    id: "text-and-pipes",
    title: "Text processing and pipes",
    questions: [
      {
        id: "tp-1",
        prompt: "Symbol that connects the output of one command to the input of another",
        answers: ["|", "pipe", "the pipe"],
        hint: "A single vertical bar.",
      },
      {
        id: "tp-2",
        prompt: "Command that searches lines in a file by pattern",
        answers: ["grep"],
        hint: "The tool behind 'to grep'.",
      },
      {
        id: "tp-3",
        prompt: "Command that prints the first 10 lines of a file by default",
        answers: ["head"],
        hint: "The opposite of tail.",
      },
      {
        id: "tp-4",
        prompt: "Command that counts bytes, words and lines",
        answers: ["wc"],
        hint: "Two letters, stands for word count.",
      },
      {
        id: "tp-5",
        prompt: "Command that shows only unique adjacent lines",
        answers: ["uniq"],
        hint: "Unique, in lowercase.",
      },
    ],
  },
  {
    id: "processes",
    title: "Processes",
    questions: [
      {
        id: "pr-1",
        prompt: "Command that lists running processes",
        answers: ["ps", "ps aux", "ps -ef"],
        hint: "Two letters.",
      },
      {
        id: "pr-2",
        prompt: "Signal number that terminates a process gracefully",
        answers: ["15", "sigterm", "terminate", "term"],
        hint: "Also how you stop a process by name with kill.",
      },
      {
        id: "pr-3",
        prompt: "Signal number that force-kills a process",
        answers: ["9", "sigkill", "kill"],
        hint: "The hammer.",
      },
      {
        id: "pr-4",
        prompt: "Command that runs a task in the background at the end of a command",
        answers: ["&", "ampersand"],
        hint: "A single ampersand.",
      },
    ],
  },
  {
    id: "shell-basics",
    title: "Shell basics",
    questions: [
      {
        id: "sh-1",
        prompt: "Variable that lists directories searched for executables",
        answers: ["path", "$PATH", "PATH"],
        hint: "PATH in uppercase.",
      },
      {
        id: "sh-2",
        prompt: "Operator that runs the next command only if the previous one succeeded",
        answers: ["&&"],
        hint: "Two ampersands.",
      },
      {
        id: "sh-3",
        prompt: "Command that makes a shell script executable",
        answers: ["chmod +x", "chmod 755"],
        hint: "chmod and something about 'execute'.",
      },
      {
        id: "sh-4",
        prompt: "Command that shows the manual page for a command",
        answers: ["man"],
        hint: "Three letters.",
      },
    ],
  },
];