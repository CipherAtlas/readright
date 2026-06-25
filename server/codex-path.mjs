import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const COMMON_CODEX_PATHS = [
  "/Applications/Codex.app/Contents/Resources/codex",
  "/opt/homebrew/bin/codex",
  "/usr/local/bin/codex",
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function codexCandidates(bin = process.env.CODEX_BIN || "codex") {
  const requested = String(bin || "codex").trim() || "codex";
  if (requested.includes("/") || path.isAbsolute(requested)) {
    return [requested];
  }

  const pathCandidates = String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((dir) => path.join(dir, requested));

  const homeCandidates = [
    path.join(os.homedir(), ".npm-global", "bin", requested),
    path.join(os.homedir(), ".local", "bin", requested),
  ];

  return unique([requested, ...pathCandidates, ...COMMON_CODEX_PATHS, ...homeCandidates]);
}

export function existingCodexCandidates(bin = process.env.CODEX_BIN || "codex") {
  return codexCandidates(bin).filter((candidate) => {
    if (!candidate.includes("/") && !path.isAbsolute(candidate)) return true;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}
