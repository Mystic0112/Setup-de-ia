import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Item, Harness, Target } from "../registry/schema.js";
import { agentsDir, commandsDir } from "../core/targets.js";
import { backupFile, exists, writeFileEnsured } from "../core/fsx.js";
import { contentDigest } from "../core/state.js";
import type { Artifact } from "../core/state.js";
import { instructionMarkdown } from "./skill.js";

const pkgRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");

/** id sem o prefixo de kind (agent:backend -> backend). */
export function itemName(item: Item): string {
  return item.id.split(":")[1];
}

/** Diretório de destino conforme o kind. */
function destDir(item: Item, harness: Harness, target: Target): string {
  return item.kind === "command"
    ? commandsDir(harness, target)
    : agentsDir(harness, target);
}

/** Resolve o arquivo de origem, garantindo que não escapa do pacote. */
function localSourceFile(item: Item): string {
  if (item.source?.type !== "local") {
    throw new Error(`${item.id}: source local esperado.`);
  }
  const source = path.resolve(pkgRoot, item.source.path);
  if (!source.startsWith(pkgRoot + path.sep)) {
    throw new Error(`${item.id}: source.path escapa do pacote`);
  }
  return source;
}

/**
 * O opencode não usa o frontmatter do Claude: `tools:` (lista) é obsoleto no formato
 * dele (objeto), `name` vem do nome do arquivo e `argument-hint` não existe. Fica só
 * o que ele entende: `description` (+ `mode: subagent` nos agentes, que o Claude
 * invoca como subagente). O corpo não muda. Sem frontmatter, devolve igual.
 */
export function opencodeMarkdown(kind: Item["kind"], content: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return content;
  const description = /^description:.*$/m.exec(match[1])?.[0];
  const front = [description, kind === "agent" ? "mode: subagent" : undefined]
    .filter((line): line is string => line !== undefined)
    .join("\n");
  return `---\n${front}\n---\n${content.slice(match[0].length)}`;
}

export interface MarkdownInstallResult {
  message: string;
  artifacts: Artifact[];
}

/**
 * Instala um agent ou command: um único arquivo .md.
 * Faz backup quando o destino já existe e não reescreve conteúdo idêntico.
 */
export async function installMarkdownFile(
  item: Item,
  harness: Harness,
  target: Target,
  dryRun: boolean
): Promise<MarkdownInstallResult> {
  const dest = path.join(destDir(item, harness, target), `${itemName(item)}.md`);

  if (!item.source) throw new Error(`${item.id}: sem source.`);
  if (item.source.type !== "local") {
    return { message: `PULADO ${item.id}: fonte git não suportada para ${item.kind}`, artifacts: [] };
  }

  if (dryRun) {
    return { message: `[dry-run] instalar ${item.kind} ${item.id} -> ${dest}`, artifacts: [] };
  }

  const src = localSourceFile(item);
  if (!(await exists(src))) {
    return {
      message: `PULADO ${item.id}: assets ausentes (${item.source.path}) — rodar 'npm run pack:skills'`,
      artifacts: [],
    };
  }

  const raw = await fs.readFile(src, "utf-8");
  const content = harness === "opencode" ? opencodeMarkdown(item.kind, raw) : raw;
  const current = (await exists(dest)) ? await fs.readFile(dest, "utf-8") : null;
  if (current === content) {
    return {
      message: `${item.kind} já atualizado: ${item.id}`,
      artifacts: [{ type: "file", path: dest, digest: contentDigest(content) }],
    };
  }

  const backup = current !== null ? await backupFile(dest) : null;
  await writeFileEnsured(dest, content);
  return {
    message: `${item.kind} instalado: ${item.id} -> ${dest}${backup ? ` (backup: ${backup})` : ""}`,
    artifacts: [{ type: "file", path: dest, digest: contentDigest(content) }],
  };
}

/**
 * Converte um agent/command em bloco de instrução, para harness sem esses conceitos.
 * Reaproveita a neutralização de marcadores e a remoção de frontmatter das skills.
 */
export async function markdownFileAsInstruction(item: Item): Promise<string | null> {
  if (item.source?.type !== "local") return null;
  const src = localSourceFile(item);
  if (!(await exists(src))) return null;
  const source = await fs.readFile(src, "utf-8");
  return `# ${item.name}\n\n${item.description}\n\n${instructionMarkdown(source)}`;
}
