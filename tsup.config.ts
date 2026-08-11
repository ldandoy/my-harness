import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.tsx"],
    format: ["esm"],
    clean: true,
    external: ["react", "ink"],
    banner: { js: "#!/usr/bin/env node" },
});