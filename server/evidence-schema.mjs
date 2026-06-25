import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const evidenceTopicJsonSchema = require("./evidence-topic.schema.json");
