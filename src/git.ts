import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { GitStatus } from "./renderer.js";

export async function readGitStatus(pi: ExtensionAPI, cwd: string): Promise<GitStatus | undefined> {
  try {
    const result = await pi.exec("git", ["-C", cwd, "status", "--porcelain=v1", "--branch"], { timeout: 1000 });
    if (result.code !== 0) return undefined;
    const lines = result.stdout.split(/\r?\n/);
    const branchLine = lines.find((line) => line.startsWith("## "));
    if (!branchLine) return undefined;
    const branch = branchLine.slice(3).split("...")[0]?.split(" [")[0] ?? "HEAD";
    let staged = 0;
    let modified = 0;
    let untracked = 0;
    for (const line of lines) {
      if (line.startsWith("??")) { untracked++; continue; }
      if (line.length >= 2 && line[0] !== " " && line[0] !== "?") staged++;
      if (line.length >= 2 && line[1] !== " " && line[1] !== "?") modified++;
    }
    return { branch, staged, modified, untracked };
  } catch {
    return undefined;
  }
}
