import babel from "@rolldown/plugin-babel";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The dev server and the build read the env variables from the .env file of
// the repository. The production server gets them from Docker Compose.
try {
  process.loadEnvFile(new URL(".env", import.meta.url));
} catch {
  // The file is optional.
}

export default defineConfig({
  server: {
    host: "127.0.0.1",
    // PLAN.md, D14: stripclub uses port 3000.
    port: 3001,
    strictPort: true,
  },
  css: {
    modules: {
      generateScopedName: "[name]__[local]__[hash:base64:5]",
    },
  },
  plugins: [
    tanstackStart({ srcDirectory: "src" }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    nitro(),
  ],
});
