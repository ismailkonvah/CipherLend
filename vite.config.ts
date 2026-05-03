import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    process.env.NODE_ENV === "production" ? cloudflare() : null,
  ],
  resolve: {
    alias: {
      buffer: "buffer/",
      crypto: resolve("src/lib/browserCryptoShim.ts"),
      fs: resolve("src/lib/browserFsShim.ts"),
    },
  },
});
