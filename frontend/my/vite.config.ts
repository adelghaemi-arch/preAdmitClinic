/*
 File: frontend/my/vite.config.ts
 Description: Vite/React/Tailwind؛ exclude پکیج پچ‌شدهٔ jalali از prebundle
 Parent Dependencies: @vitejs/plugin-react, @tailwindcss/vite, patch-package
 */
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // پچ patch-package روی @jalali-js/react (فیلتر سال آینده) نباید در کش deps کهنه بماند
  optimizeDeps: {
    exclude: ["@jalali-js/react"],
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
