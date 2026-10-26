import os from "node:os";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// Isola os backups da CLI num tmp durante os testes, para não escrever no
// ~/.setup-definitivo real da máquina de quem roda a suíte.
export default defineConfig({
  test: {
    // worktrees e sessões do Claude guardam cópias antigas do repo, com testes que rodam código velho
    exclude: [...configDefaults.exclude, ".claude/**"],
    env: {
      SETUP_DEFINITIVO_HOME: path.join(os.tmpdir(), "setup-definitivo-test-home"),
    },
  },
});
