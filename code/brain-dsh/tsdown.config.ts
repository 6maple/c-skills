import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  // CLI/bin package: no type declarations needed, skip dts (avoids the tsgo
  // dependency). `exports: true` keeps only the exported entry points.
  dts: false,
  exports: true,
});
