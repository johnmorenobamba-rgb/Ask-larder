// Fails if a tracked text source file contains a NUL byte, a Unicode replacement character
// (U+FFFD) or is not valid UTF-8. Added after a stray NUL byte corrupted route.ts (git then
// treated the file as binary). Usage:
//   node scripts/check-source-integrity.mjs            check every tracked file
//   node scripts/check-source-integrity.mjs --staged   check only files staged for commit
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md|mdx|sql|html|yml|yaml|toml|txt|cmd|sh)$/i;
const staged = process.argv.includes("--staged");

const args = staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "-z"];
const files = execFileSync("git", args, { maxBuffer: 1 << 28 })
  .toString("utf8")
  .split("\0")
  .filter((f) => f && TEXT_EXT.test(f));

const decoder = new TextDecoder("utf-8", { fatal: true });
const problems = [];

for (const file of files) {
  let buf;
  try {
    buf = staged ? execFileSync("git", ["show", `:${file}`], { maxBuffer: 1 << 28 }) : readFileSync(file);
  } catch {
    continue; // deleted or unreadable: nothing to check
  }
  if (buf.includes(0)) {
    problems.push(`${file}: contains a NUL byte (offset ${buf.indexOf(0)})`);
    continue;
  }
  let text;
  try {
    text = decoder.decode(buf);
  } catch {
    problems.push(`${file}: is not valid UTF-8`);
    continue;
  }
  const at = text.indexOf(String.fromCharCode(0xfffd));
  if (at >= 0) {
    const line = text.slice(0, at).split("\n").length;
    problems.push(`${file}:${line}: contains a replacement character (U+FFFD), usually a corrupted edit`);
  }
}

if (problems.length) {
  console.error("Source integrity check FAILED:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`Source integrity check passed (${files.length} ${staged ? "staged " : ""}files).`);
