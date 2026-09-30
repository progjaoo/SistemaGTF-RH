import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32" && command === npmCommand
  });
}

run(npmCommand, ["--prefix", "backend", "exec", "--", "prisma", "generate", "--schema=./backend/prisma/schema.prisma"]);
run(npmCommand, ["run", "build", "--prefix", "backend"]);
run(npmCommand, ["run", "build", "--prefix", "frontend"]);
run(process.execPath, ["scripts/prepare-vercel-api.mjs"]);

const temporarySchemaDir = resolve(rootDir, "prisma");
mkdirSync(temporarySchemaDir, { recursive: true });
cpSync(resolve(rootDir, "backend/prisma/schema.prisma"), resolve(temporarySchemaDir, "schema.prisma"));

try {
  // The serverless bundle resolves @prisma/client from the root node_modules.
  run(npmCommand, ["exec", "--", "prisma", "generate", "--schema=./prisma/schema.prisma"]);
} finally {
  rmSync(temporarySchemaDir, { recursive: true, force: true });
}
