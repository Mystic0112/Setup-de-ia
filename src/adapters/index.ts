import type { Adapter } from "./types.js";
import type { Harness } from "../registry/schema.js";
import { claudeAdapter } from "./claude.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";
import { geminiAdapter } from "./gemini.js";
import { opencodeAdapter } from "./opencode.js";

/** Adapters implementados. Harness sem adapter ainda cai no aviso "não implementado". */
export const ADAPTERS: Partial<Record<Harness, Adapter>> = {
  claude: claudeAdapter,
  cursor: cursorAdapter,
  codex: codexAdapter,
  gemini: geminiAdapter,
  opencode: opencodeAdapter,
};

export function getAdapter(harness: Harness): Adapter | undefined {
  return ADAPTERS[harness];
}
