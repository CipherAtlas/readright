import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { normalizeArtifact, reviewPrompt } from "./mhcif-runner.mjs";
import { existingCodexCandidates } from "./codex-path.mjs";

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, "server", "evidence-topic.schema.json");
const FRAMEWORK_PATH = path.join(ROOT, "docs", "mhcif-codex-review-protocol.md");
const CALIBRATION_PATH = path.join(ROOT, "docs", "mhcif-calibration-examples.md");

function codexExecutable() {
  return process.env.CODEX_BIN || "codex";
}

function buildCodexPrompt({ mode, query, articleUrl, articleText, preSearchFilters = {} }) {
  const sharedPrompt = reviewPrompt({
    mode,
    query,
    articleUrl,
    articleText,
    preSearchFilters,
    framework: `Read ${FRAMEWORK_PATH} and ${CALIBRATION_PATH} from this repository and follow them exactly.`,
  });

  return `${sharedPrompt}

Codex CLI runner instructions:
- You are running inside the local evidence-map repository.
- Read ${FRAMEWORK_PATH}; it is the single source of truth for the framework.
- Read ${CALIBRATION_PATH}; use it to calibrate adjacent direction labels and structured field values.
- Produce the final answer as JSON only.
- The final JSON must satisfy ${SCHEMA_PATH}.
- Do not edit files, run package installs, or create artifacts yourself.
- Use browser/web reading only for public, permitted pages.
- Do not bypass paywalls, login walls, CAPTCHAs, or explicit restrictions.`;
}

function runCodexProcess({ prompt, outputPath, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const args = [
      "exec",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--skip-git-repo-check",
      "--cd",
      ROOT,
      "--output-schema",
      SCHEMA_PATH,
      "-o",
      outputPath,
      prompt,
    ];

    const candidates = existingCodexCandidates(codexExecutable());
    let index = 0;

    const tryNext = () => {
      const command = candidates[index];
      if (!command) {
        reject(new Error("Codex CLI was not found. Install Codex or set CODEX_BIN to the full codex binary path."));
        return;
      }

      const child = spawn(command, args, {
        cwd: ROOT,
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let retriedAfterError = false;
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`Codex CLI review timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        if (error.code === "ENOENT") {
          retriedAfterError = true;
          index += 1;
          tryNext();
          return;
        }
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (retriedAfterError) return;
        if (Number(code) === -2 && index + 1 < candidates.length) {
          index += 1;
          tryNext();
          return;
        }
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(
          new Error(
            `Codex CLI exited with ${code}.\n${stderr || stdout || "No output."}`
          )
        );
      });
    };

    tryNext();
  });
}

export async function runCodexMhcifReview({
  mode,
  query,
  articleUrl = "",
  articleText = "",
  preSearchFilters = {},
}) {
  if (mode === "query" && !query?.trim()) {
    const error = new Error("A query is required.");
    error.statusCode = 400;
    throw error;
  }

  if (mode === "article" && !articleUrl?.trim() && !articleText?.trim()) {
    const error = new Error("An article URL or article text is required.");
    error.statusCode = 400;
    throw error;
  }

  const outputPath = path.join(
    os.tmpdir(),
    `mhcif-codex-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
  const prompt = buildCodexPrompt({
    mode,
    query,
    articleUrl,
    articleText: articleText.slice(0, 30000),
    preSearchFilters,
  });

  await runCodexProcess({
    prompt,
    outputPath,
    timeoutMs: Number(process.env.CODEX_RUN_TIMEOUT_MS || 20 * 60 * 1000),
  });

  const raw = await fs.readFile(outputPath, "utf8");
  await fs.rm(outputPath, { force: true });

  const fallbackQuery =
    mode === "article"
      ? `Article inspection: ${articleUrl || articleText.slice(0, 80)}`
      : query;
  return normalizeArtifact(JSON.parse(raw), fallbackQuery, "codex");
}
