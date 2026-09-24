import { defineConfig } from "vitest/config";

export default defineConfig({
  pool: "forks",
  poolOptions: { forks: { singleFork: true } },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000
    // Arquivos em sequência no mesmo processo: os testes de API dividem
    // um banco dedicado e preços globais afetam todos os períodos.
  }
});
