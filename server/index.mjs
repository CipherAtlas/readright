import "dotenv/config";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { artifactFilename, runMhcifReview } from "./mhcif-runner.mjs";
import { runCodexMhcifReview } from "./codex-runner.mjs";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.EVIDENCE_DATA_DIR
  ? path.resolve(process.env.EVIDENCE_DATA_DIR)
  : path.join(ROOT, "data", "topics");
const CANVAS_DIR = process.env.CANVAS_DATA_DIR
  ? path.resolve(process.env.CANVAS_DATA_DIR)
  : path.join(ROOT, "data", "canvases");
const DIST_DIR = path.join(ROOT, "dist");
const ENV_PATH = path.join(ROOT, ".env");
const FRAMEWORK_VERSION = "mhcif-0.3-codex";

function reviewEngine() {
  return process.env.REVIEW_ENGINE || "auto";
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function readPreSearchFilters(body) {
  if (body.preSearchFilters && typeof body.preSearchFilters === "object") {
    const evidenceTypes = Array.isArray(body.preSearchFilters.evidenceTypes)
      ? body.preSearchFilters.evidenceTypes.map(String).filter(Boolean)
      : [String(body.preSearchFilters.evidenceType || "Human studies")];
    return {
      topicArea: String(body.preSearchFilters.topicArea || "Health"),
      evidenceType: evidenceTypes.join(", "),
      evidenceTypes,
      publicationWindow: String(body.preSearchFilters.publicationWindow || "Last 10 years"),
    };
  }

  const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) : [];
  const evidenceTypes = [scopes[1] || "Human studies"];
  return {
    topicArea: scopes[0] || "Health",
    evidenceType: evidenceTypes.join(", "),
    evidenceTypes,
    publicationWindow: scopes[2] || "Last 10 years",
  };
}

function safeCanvasId(value) {
  const id = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  if (!id) {
    const error = new Error("A canvas id is required.");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function canvasFilePath(id) {
  return path.join(CANVAS_DIR, `${id}.json`);
}

function canvasVersionsFilePath(id) {
  return path.join(CANVAS_DIR, `${id}.versions.json`);
}

function summarizeCanvas(canvas) {
  const nodeCount = Array.isArray(canvas.nodes) ? canvas.nodes.length : 0;
  const arrowCount = Array.isArray(canvas.arrows) ? canvas.arrows.length : 0;
  return `${nodeCount} element${nodeCount === 1 ? "" : "s"} · ${arrowCount} arrow${arrowCount === 1 ? "" : "s"}`;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function readEnvFile() {
  try {
    return await fs.readFile(ENV_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function envLineValue(value) {
  const text = String(value ?? "");
  if (!text || /[\s#"'\\]/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}

async function writeEnvUpdates(updates) {
  const current = await readEnvFile();
  const lines = current ? current.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(updates));
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${envLineValue(value)}`;
  });

  for (const [key, value] of pending) {
    nextLines.push(`${key}=${envLineValue(value)}`);
  }

  while (nextLines.length && nextLines[nextLines.length - 1] === "") {
    nextLines.pop();
  }

  await fs.writeFile(ENV_PATH, `${nextLines.join("\n")}\n`, "utf8");
}

function codexBin() {
  return process.env.CODEX_BIN || "codex";
}

function checkCodexCli() {
  return new Promise((resolve) => {
    const child = spawn(codexBin(), ["--version"], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ available: false, version: "", error: "Codex CLI check timed out." });
    }, 5000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ available: false, version: "", error: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const output = (stdout || stderr).trim();
      resolve({
        available: code === 0,
        version: code === 0 ? output.split(/\r?\n/)[0] || "Available" : "",
        error: code === 0 ? "" : output || `Codex CLI exited with ${code}.`,
      });
    });
  });
}

async function readRuntimeSettings() {
  const codexCli = await checkCodexCli();
  const engine = reviewEngine();
  return {
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
    openaiReasoningEffort: process.env.OPENAI_REASONING_EFFORT || "medium",
    reviewEngine: engine,
    activeEngine: engine === "auto"
      ? process.env.OPENAI_API_KEY
        ? "openai_api"
        : "codex_cli"
      : engine,
    codexBin: codexBin(),
    codexCli,
    envFile: ENV_PATH,
  };
}

async function saveRuntimeSettings(body) {
  const updates = {};

  if (typeof body.reviewEngine === "string") {
    const value = body.reviewEngine.trim();
    if (!["auto", "openai_api", "codex_cli"].includes(value)) {
      const error = new Error("Review engine must be auto, openai_api, or codex_cli.");
      error.statusCode = 400;
      throw error;
    }
    process.env.REVIEW_ENGINE = value;
    updates.REVIEW_ENGINE = value;
  }

  if (typeof body.openaiModel === "string") {
    const value = body.openaiModel.trim();
    if (value) {
      process.env.OPENAI_MODEL = value;
      updates.OPENAI_MODEL = value;
    }
  }

  if (typeof body.openaiReasoningEffort === "string") {
    const value = body.openaiReasoningEffort.trim();
    if (!["minimal", "low", "medium", "high"].includes(value)) {
      const error = new Error("Reasoning effort must be minimal, low, medium, or high.");
      error.statusCode = 400;
      throw error;
    }
    process.env.OPENAI_REASONING_EFFORT = value;
    updates.OPENAI_REASONING_EFFORT = value;
  }

  if (typeof body.codexBin === "string") {
    const value = body.codexBin.trim() || "codex";
    process.env.CODEX_BIN = value;
    updates.CODEX_BIN = value;
  }

  if (typeof body.openaiApiKey === "string" && body.openaiApiKey.trim()) {
    const value = body.openaiApiKey.trim();
    process.env.OPENAI_API_KEY = value;
    updates.OPENAI_API_KEY = value;
  } else if (body.clearOpenaiApiKey === true) {
    delete process.env.OPENAI_API_KEY;
    updates.OPENAI_API_KEY = "";
  }

  if (Object.keys(updates).length) {
    await writeEnvUpdates(updates);
  }

  return readRuntimeSettings();
}

async function saveTopic(topic) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const filename = artifactFilename(topic);
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
  return { filename, filePath };
}

async function listTopics() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = await fs.readdir(DATA_DIR);
  const topics = [];

  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const topic = JSON.parse(await fs.readFile(filePath, "utf8"));
      topics.push({
        id: topic.id,
        query: topic.query,
        generatedAt: topic.generatedAt,
        frameworkVersion: topic.frameworkVersion,
        verdictSummary: topic.verdict?.summary || "",
        confidence: topic.verdict?.confidence || "insufficient",
        claimCount: Array.isArray(topic.claims) ? topic.claims.length : 0,
        sourceCount: Array.isArray(topic.sources) ? topic.sources.length : 0,
        filename: file,
      });
    } catch {
      topics.push({ filename: file, unreadable: true });
    }
  }

  return topics.sort((a, b) =>
    String(b.generatedAt || "").localeCompare(String(a.generatedAt || ""))
  );
}

async function readTopicByFilename(filename) {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) {
    const error = new Error("Invalid topic filename.");
    error.statusCode = 400;
    throw error;
  }

  return JSON.parse(await fs.readFile(path.join(DATA_DIR, filename), "utf8"));
}

async function readCanvasById(idValue) {
  const id = safeCanvasId(idValue);
  const filePath = canvasFilePath(id);

  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      const notFound = new Error("Canvas not found.");
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
}

async function readCanvasVersionsById(idValue) {
  const id = safeCanvasId(idValue);
  const filePath = canvasVersionsFilePath(id);

  try {
    const record = JSON.parse(await fs.readFile(filePath, "utf8"));
    const versions = Array.isArray(record.versions) ? record.versions : [];
    return { id, versions };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { id, versions: [] };
    }
    throw error;
  }
}

async function saveCanvas(body) {
  const id = safeCanvasId(body.id);
  await fs.mkdir(CANVAS_DIR, { recursive: true });
  const now = new Date().toISOString();
  const canvas = {
    id,
    topicId: String(body.topicId || id),
    query: String(body.query || ""),
    view: String(body.view || "overview"),
    selectedBranchId: String(body.selectedBranchId || ""),
    selectedReasonId: String(body.selectedReasonId || ""),
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    arrows: Array.isArray(body.arrows) ? body.arrows : [],
    updatedAt: now,
  };
  const filePath = canvasFilePath(id);
  const versionFilePath = canvasVersionsFilePath(id);
  const existingVersions = await readCanvasVersionsById(id);
  const versionNumber = existingVersions.versions.length + 1;
  const version = {
    id: `v-${versionNumber}-${now.replace(/[^0-9]/g, "")}`,
    versionNumber,
    createdAt: now,
    label: `Version ${versionNumber}`,
    summary: summarizeCanvas(canvas),
    canvas,
  };
  const versions = [...existingVersions.versions, version];

  await fs.writeFile(filePath, `${JSON.stringify(canvas, null, 2)}\n`, "utf8");
  await fs.writeFile(
    versionFilePath,
    `${JSON.stringify({ id, versions }, null, 2)}\n`,
    "utf8"
  );
  return {
    canvas,
    version,
    versions,
    saved: { filename: `${id}.json`, filePath, versionFilename: `${id}.versions.json`, versionFilePath },
  };
}

async function runReview(payload) {
  const engine = reviewEngine();
  if (engine === "openai_api") {
    return runMhcifReview(payload);
  }

  if (engine === "codex_cli") {
    return runCodexMhcifReview(payload);
  }

  if (engine !== "auto") {
    const error = new Error(
      `Unknown REVIEW_ENGINE "${engine}". Use auto, openai_api, or codex_cli.`
    );
    error.statusCode = 500;
    throw error;
  }

  if (process.env.OPENAI_API_KEY) {
    return runMhcifReview(payload);
  }

  return runCodexMhcifReview(payload);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    const engine = reviewEngine();
    sendJson(res, 200, {
      ok: true,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      reviewEngine: engine,
      codexCliConfigured: engine === "codex_cli" || engine === "auto",
      frameworkVersion: FRAMEWORK_VERSION,
      dataDir: DATA_DIR,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    sendJson(res, 200, await readRuntimeSettings());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    const body = await readJson(req);
    sendJson(res, 200, await saveRuntimeSettings(body));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/topics") {
    sendJson(res, 200, { topics: await listTopics() });
    return;
  }

  const canvasVersionsMatch = url.pathname.match(/^\/api\/canvas\/([^/]+)\/versions$/);
  if (req.method === "GET" && canvasVersionsMatch) {
    const id = decodeURIComponent(canvasVersionsMatch[1]);
    sendJson(res, 200, await readCanvasVersionsById(id));
    return;
  }

  const canvasCurrentMatch = url.pathname.match(/^\/api\/canvas\/([^/]+)$/);
  if (req.method === "GET" && canvasCurrentMatch) {
    const id = decodeURIComponent(canvasCurrentMatch[1]);
    sendJson(res, 200, { canvas: await readCanvasById(id) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/canvas") {
    const body = await readJson(req);
    const saved = await saveCanvas(body);
    sendJson(res, 200, saved);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/topics/")) {
    const filename = decodeURIComponent(url.pathname.replace("/api/topics/", ""));
    sendJson(res, 200, { topic: await readTopicByFilename(filename) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/review/claim") {
    const body = await readJson(req);
    const topic = await runReview({
      mode: "query",
      query: String(body.query || ""),
      preSearchFilters: readPreSearchFilters(body),
    });
    const saved = await saveTopic(topic);
    sendJson(res, 200, { topic, saved });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/review/article") {
    const body = await readJson(req);
    const topic = await runReview({
      mode: "article",
      query: String(body.query || ""),
      articleUrl: String(body.articleUrl || ""),
      articleText: String(body.articleText || ""),
      preSearchFilters: readPreSearchFilters(body),
    });
    const saved = await saveTopic(topic);
    sendJson(res, 200, { topic, saved });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

async function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(DIST_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    const indexPath = path.join(DIST_DIR, "index.html");
    try {
      res.writeHead(200, { "Content-Type": contentTypes[".html"] });
      createReadStream(indexPath).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("Build the frontend with `npm run build` first.");
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Unexpected server error",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Evidence Map server listening on http://localhost:${PORT}`);
  console.log(`Framework: ${FRAMEWORK_VERSION}`);
  console.log(`Review engine: ${reviewEngine()}`);
});
