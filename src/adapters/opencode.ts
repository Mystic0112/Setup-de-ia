import path from "node:path";
import { harnessBase } from "../core/targets.js";
import { contentDigest } from "../core/state.js";
import { addOpencodeMcp, mcpName, opencodeMcpEntry } from "../installers/mcp.js";
import { exists } from "../core/fsx.js";
import { createAdapter } from "./base.js";

/**
 * opencode: skills, agentes e commands nativos (em .opencode/ no projeto e
 * ~/.config/opencode global), instruções em AGENTS.md, MCP em opencode.json.
 * Sem plugins do Claude e sem settings.json, então hooks são pulados.
 */
export const opencodeAdapter = createAdapter({
  id: "opencode",
  nativeSkills: true,
  nativeAgents: true,
  nativeCommands: true,
  plugins: false,
  settings: false,
  installMcp: async (item, ctx) => {
    // global: ~/.config/opencode/opencode.json; projeto: opencode.json na raiz (não em .opencode/)
    const dir = ctx.target === "global" ? harnessBase("opencode", "global") : process.cwd();
    const jsonc = path.join(dir, "opencode.jsonc");
    const file = !(await exists(path.join(dir, "opencode.json"))) && (await exists(jsonc))
      ? jsonc
      : path.join(dir, "opencode.json");
    const message = await addOpencodeMcp(item, file, ctx.dryRun);
    return {
      message,
      artifact: ctx.dryRun
        ? undefined
        : {
            type: "mcp",
            path: file,
            name: mcpName(item),
            key: "mcp",
            digest: contentDigest(JSON.stringify(opencodeMcpEntry(item))),
          },
    };
  },
});
