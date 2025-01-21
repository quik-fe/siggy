import { defineConfig } from "tsup";

export default defineConfig((options) => {
  return {
    entry: ["src/main.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    minify: !options.watch,
    splitting: false,
    clean: true,
    target: "esnext",
  };
});
