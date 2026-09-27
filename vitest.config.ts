import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/features/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/use-*.ts", "src/vite-env.d.ts", "src/lib/notify.ts", "src/lib/cn.ts"],
    },
  },
});
