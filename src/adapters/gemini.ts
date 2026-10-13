import path from "node:path";
import { harnessBase } from "../core/targets.js";
import { contentDigest } from "../core/state.js";
import { addCursorMcp, mcpName } from "../installers/mcp.js";
import { exists } from "../core/fsx.js";
import { createAdapter } from "./base.js";

export const geminiAdapter = createAdapter({
  id: "gemini",
  nativeSkills: true,
  nativeAgents: true,
  nativeCommands: true,
  plugins: true,
  settings: false,
  installMcp: async (item, ctx) => {
    const base = harnessBase("gemini", ctx.target);
    const configPath = path.join(base, "config", "mcp_config.json");
    const rootPath = path.join(base, "mcp_config.json");
    const file = (await exists(configPath)) ? configPath : rootPath;
    const message = await addCursorMcp(item, file, ctx.dryRun);
    return {
      message,
      artifact: ctx.dryRun
        ? undefined
        : {
            type: "mcp",
            path: file,
            name: mcpName(item),
            digest: contentDigest(
              JSON.stringify({
                command: item.mcp!.cmd,
                args: item.mcp!.args,
              })
            ),
          },
    };
  },
});
