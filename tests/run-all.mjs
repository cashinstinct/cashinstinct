import { spawnSync } from "node:child_process";

const commands = ["audit:quick", "audit:full"];
let failed = false;

for (const command of commands) {
  const result = spawnSync("npm", ["run", command], {
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
