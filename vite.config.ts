/// <reference types="vitest/config" />

import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// GitHub Pages serves a project site from /<repo>/, so the build needs to know
// its own prefix. Locally there is no prefix, hence the "/" default.
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base: base.endsWith("/") ? base : `${base}/`,
  plugins: [preact()],
  test: {
    environment: "happy-dom",
  },
});
