<p align="center">
  <img src="public/readright-logo.png" alt="ReadRight logo" width="180">
</p>

# ReadRight

ReadRight is a local-first prototype for checking health and mental-health claims.

It turns a topic, claim, or article into a visual evidence map so a user can see what supports the claim, what argues against it, which sources were used, and where the evidence is uncertain.

## What It Does

- Builds structured evidence reviews using the `mhcif-0.3-codex` framework.
- Shows claims as a canvas with support, opposition, assumptions, source notes, and unresolved questions.
- Lets users add their own notes, highlights, sources, diagram shapes, and arrows.
- Saves review artifacts and canvas versions as local JSON files.
- Exports evidence summaries as JSON, CSV, XLSX, DOCX, or a print-ready PDF.

## How It Works

ReadRight has a React/Vite frontend and a small Node server.

The server can generate reviews in two ways:

- With the OpenAI API, using `OPENAI_API_KEY`.
- With the local Codex CLI, using an existing Codex login.

Generated review files are saved in `data/topics`. Canvas files and version history are saved in `data/canvases`.

## Run Locally

```bash
npm install
npm run api
npm run dev
```

Then open the Vite URL shown in the terminal.

Open **Settings** in the top bar before building live maps. You can either:

- Paste an OpenAI API key. ReadRight saves it to your local `.env` file, which is ignored by git.
- Choose Codex CLI after installing Codex and running `codex login` on the same machine.

The default `REVIEW_ENGINE=auto` uses the OpenAI API when a key is configured and otherwise falls back to Codex CLI.

For a production-style local run:

```bash
npm run build
npm start
```

## Project Notes

ReadRight is a research and evidence-organization tool. It is not a medical diagnosis tool and does not replace professional care.

## GitHub Distribution Notes

- Commit `.env.example`, not `.env`.
- `data/topics/*.json` is ignored so generated reviews stay local.
- Users need their own OpenAI API key or their own local Codex login.
