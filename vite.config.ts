import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: (() => {
    const proxyTarget = process.env.FUNCTIONS_PROXY || process.env.VITE_FUNCTIONS_BASE_URL || "";
    const base = {
      host: "::",
      port: 8080,
    } as any;

    if (proxyTarget) {
      base.proxy = {
        "/api/functions": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/functions/, ""),
        },
      };
    }

    return base;
  })(),
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
