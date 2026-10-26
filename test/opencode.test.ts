import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prompts from "@clack/prompts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAdd } from "../src/commands/add.js";
import { contentDigest, stateFile } from "../src/core/state.js";
import { addOpencodeMcp, opencodeMcpEntry } from "../src/installers/mcp.js";
import { opencodeMarkdown } from "../src/installers/markdownFile.js";
import { removeStateEntry } from "../src/installers/remove.js";
import type { Item } from "../src/registry/schema.js";

const pkgRoot = path.resolve(fileURLToPath(import.meta.url), "../..");

const fake: Item = {
  id: "mcp:fake",
  kind: "mcp",
  name: "fake",
  description: "Fixture",
  targets: ["global", "project"],
  needsSecret: false,
  mcp: { cmd: "npx", args: ["-y", "fake@1"] },
};

let tmp: string;
let previousCwd: string;

beforeEach(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(prompts.log, "step").mockImplementation(() => {});
  vi.spyOn(prompts.log, "warn").mockImplementation(() => {});
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "setup-definitivo-opencode-"));
  previousCwd = process.cwd();
  process.chdir(tmp);
});

afterEach(async () => {
  process.chdir(previousCwd);
  vi.restoreAllMocks();
  process.exitCode = undefined;
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("isolamento do manifesto", () => {
  // Já houve suíte gravando no ~/.setup-definitivo/state.json real da máquina.
  it("stateFile respeita SETUP_DEFINITIVO_HOME", () => {
    expect(stateFile()).toBe(path.join(process.env.SETUP_DEFINITIVO_HOME!, "state.json"));
    expect(stateFile().startsWith(path.join(os.homedir(), ".setup-definitivo"))).toBe(false);
  });
});

describe("opencodeMarkdown", () => {
  const agent = "---\nname: legal\ndescription: Faz coisa: com dois-pontos\ntools:\n  - Read\n  - Bash\n---\n\nCorpo do agente.\n";
  const command = "---\ndescription: Chama o legal\nargument-hint: <dúvida>\n---\n\nUse $ARGUMENTS aqui.\n";

  it("agente fica só com description e mode subagent, sem name nem tools", () => {
    expect(opencodeMarkdown("agent", agent)).toBe(
      "---\ndescription: Faz coisa: com dois-pontos\nmode: subagent\n---\n\nCorpo do agente.\n"
    );
  });

  it("command fica só com description e preserva $ARGUMENTS", () => {
    expect(opencodeMarkdown("command", command)).toBe(
      "---\ndescription: Chama o legal\n---\n\nUse $ARGUMENTS aqui.\n"
    );
  });

  it("sem frontmatter devolve igual", () => {
    expect(opencodeMarkdown("agent", "só corpo\n")).toBe("só corpo\n");
  });

  it("nos assets reais nenhum agente ou command sobra com tools/name/argument-hint", async () => {
    for (const [kind, dir] of [["agent", "assets/agents"], ["command", "assets/commands"]] as const) {
      for (const file of await fs.readdir(path.join(pkgRoot, dir))) {
        const raw = await fs.readFile(path.join(pkgRoot, dir, file), "utf-8");
        const out = opencodeMarkdown(kind, raw);
        const front = /^---\n([\s\S]*?)\n---\n/.exec(out)?.[1] ?? "";
        expect(front, file).toContain("description:");
        expect(front, file).not.toMatch(/^(tools|name|argument-hint):/m);
        expect(out.endsWith(raw.slice(raw.indexOf("\n---\n", 4) + 5)), file).toBe(true); // corpo intacto
      }
    }
  });
});

describe("addOpencodeMcp", () => {
  it("cria opencode.json com $schema e o servidor no formato do opencode", async () => {
    const file = path.join(tmp, "opencode.json");
    await addOpencodeMcp(fake, file, false);
    expect(JSON.parse(await fs.readFile(file, "utf-8"))).toEqual({
      $schema: "https://opencode.ai/config.json",
      mcp: { fake: { type: "local", command: ["npx", "-y", "fake@1"], enabled: true } },
    });
  });

  it("preserva o resto do arquivo e é idempotente", async () => {
    const file = path.join(tmp, "opencode.json");
    const original = { theme: "x", mcp: { outro: { type: "remote", url: "https://e.x" } } };
    await fs.writeFile(file, JSON.stringify(original));
    await addOpencodeMcp(fake, file, false);
    const once = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(once);
    expect(parsed.theme).toBe("x");
    expect(parsed.mcp.outro).toEqual(original.mcp.outro);
    expect(await addOpencodeMcp(fake, file, false)).toContain("já existe");
    expect(await fs.readFile(file, "utf-8")).toBe(once);
  });

  it("recusa arquivo com comentários sem alterar nada", async () => {
    const file = path.join(tmp, "opencode.jsonc");
    const text = '{\n  // meu comentário\n  "theme": "x"\n}\n';
    await fs.writeFile(file, text);
    await expect(addOpencodeMcp(fake, file, false)).rejects.toThrow(/nenhuma mudança aplicada/);
    expect(await fs.readFile(file, "utf-8")).toBe(text);
  });

  it("dry-run não escreve", async () => {
    const file = path.join(tmp, "opencode.json");
    await addOpencodeMcp(fake, file, true);
    await expect(fs.access(file)).rejects.toThrow();
  });
});

describe("remove de MCP do opencode", () => {
  const entry = (file: string) => ({
    itemId: "mcp:fake",
    kind: "mcp" as const,
    harness: "opencode" as const,
    target: "project" as const,
    projectRoot: path.dirname(file),
    artifacts: [{
      type: "mcp" as const, path: file, name: "fake", key: "mcp",
      digest: contentDigest(JSON.stringify(opencodeMcpEntry(fake))),
    }],
    installedAt: "2026-10-26T12:00:00.000Z",
  });

  it("tira só o nosso servidor da chave mcp e mantém o resto", async () => {
    const file = path.join(tmp, "opencode.json");
    await addOpencodeMcp(fake, file, false);
    const withOther = JSON.parse(await fs.readFile(file, "utf-8"));
    withOther.mcp.outro = { type: "local", command: ["x"] };
    await fs.writeFile(file, JSON.stringify(withOther, null, 2));
    const result = await removeStateEntry(entry(file), false);
    expect(result.removed).toBe(true);
    const after = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(after.mcp).toEqual({ outro: { type: "local", command: ["x"] } });
    expect(after.$schema).toBe("https://opencode.ai/config.json");
  });

  it("recusa se o usuário editou o servidor", async () => {
    const file = path.join(tmp, "opencode.json");
    await addOpencodeMcp(fake, file, false);
    const edited = JSON.parse(await fs.readFile(file, "utf-8"));
    edited.mcp.fake.environment = { TOKEN: "x" };
    await fs.writeFile(file, JSON.stringify(edited));
    const result = await removeStateEntry(entry(file), false);
    expect(result.removed).toBe(false);
    expect(result.message).toContain("foi alterado pelo usuário");
  });
});

describe("adapter opencode (alvo projeto)", () => {
  it("instala agent, command, skill e instrução nos caminhos do opencode", async () => {
    await runAdd(["command:legal", "skill:leis-br"], { harness: ["opencode"], project: true, dryRun: false });

    const agent = await fs.readFile(path.join(tmp, ".opencode/agents/legal.md"), "utf-8");
    expect(agent).toMatch(/^---\ndescription: .*\nmode: subagent\n---\n/);
    expect(agent).not.toMatch(/^tools:/m);

    const command = await fs.readFile(path.join(tmp, ".opencode/commands/legal.md"), "utf-8");
    expect(command).toContain("$ARGUMENTS");
    expect(command).not.toContain("argument-hint");

    expect(await fs.readFile(path.join(tmp, ".opencode/skills/leis-br/SKILL.md"), "utf-8")).toContain("name: leis-br");
    expect(await fs.readFile(path.join(tmp, ".opencode/skills/leis-br/scripts/leis.py"), "utf-8")).toContain("ctresb/leis");
  });

  it("registra MCP em ./opencode.json e instrução base em ./AGENTS.md", async () => {
    await runAdd(["mcp:desktop-commander", "config:base-instructions"], {
      harness: ["opencode"], project: true, dryRun: false,
    });
    const config = JSON.parse(await fs.readFile(path.join(tmp, "opencode.json"), "utf-8"));
    expect(config.mcp["desktop-commander"]).toMatchObject({ type: "local", enabled: true });
    expect(Array.isArray(config.mcp["desktop-commander"].command)).toBe(true);
    expect(await fs.readFile(path.join(tmp, "AGENTS.md"), "utf-8")).toContain("setup-definitivo:start:base");
  });

  it("hook e plugin são pulados, sem escrever nada", async () => {
    await runAdd(["hook:rule-guard", "plugin:caveman"], { harness: ["opencode"], project: true, dryRun: false });
    await expect(fs.access(path.join(tmp, ".opencode"))).rejects.toThrow();
  });
});
