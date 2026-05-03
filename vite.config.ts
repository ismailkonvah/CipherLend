import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const isVercel = Boolean(process.env.VERCEL);

export default defineConfig({
  define: {
    Buffer: "globalThis.Buffer",
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    isVercel ? nitro() : null,
    viteReact(),
    tailwindcss(),
    process.env.NODE_ENV === "production" && !isVercel ? cloudflare() : null,
  ],
  resolve: {
    alias: {
      buffer: "buffer/",
      crypto: resolve("src/lib/browserCryptoShim.ts"),
      fs: resolve("src/lib/browserFsShim.ts"),
    },
  },
});
