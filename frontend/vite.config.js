import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/analyze": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sectors": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/ml": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ml/, ""),
      },
      "/alpha": {
        target: "https://www.alphavantage.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/alpha/, ""),
      },
      "/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo/, ""),
      },
    },
  },
});
