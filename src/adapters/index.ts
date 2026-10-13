import type { Adapter } from "./types.js";
import type { Harness } from "../registry/schema.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";

/** Adapters implementados. Harness sem adapter ainda cai no aviso "não implementado". */
export const ADAPTERS: Partial<Record<Harness, Adapter>> = {
  claude: claudeAdapter,
  cursor: cursorAdapter,
  codex: codexAdapter,
  gemini: geminiAdapter,
};

export function getAdapter(harness: Harness): Adapter | undefined {
  return ADAPTERS[harness];
}
