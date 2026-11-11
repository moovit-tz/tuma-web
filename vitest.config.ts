import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"] } },
      {
        extends: true,
        test: { name: "integration", include: ["src/**/*.int.test.ts"], setupFiles: ["src/server/__tests__/setup.ts"], fileParallelism: false, testTimeout: 30_000 },
      },
    ],
  },
});
