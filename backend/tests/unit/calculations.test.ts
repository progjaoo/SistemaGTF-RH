// Testes puros de preço por vigência (sem banco).
import type { MealPrice } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { resolveMealPrice, roundCurrency } from "../../src/services/calculations.js";

const d = (value: string) => new Date(`${value}T00:00:00.000Z`);

function price(partial: Partial<MealPrice> & { value: number; validFrom: Date }): MealPrice {
  return {
    id: crypto.randomUUID(),
    value: partial.value as unknown as MealPrice["value"],
    validFrom: partial.validFrom,
    validTo: partial.validTo ?? null,
    employeeId: partial.employeeId ?? null,
    createdById: null,
    createdAt: new Date()
  };
}

describe("resolveMealPrice", () => {
  it("individual prevalece sobre global", () => {
    const prices = [
      price({ value: 8.5, validFrom: d("2026-01-01") }),
      price({ value: 11, validFrom: d("2026-01-01"), employeeId: "emp-1" })
    ];
    expect(Number(resolveMealPrice(prices, "emp-1", d("2026-06-10"))!.value)).toBe(11);
    expect(Number(resolveMealPrice(prices, "emp-2", d("2026-06-10"))!.value)).toBe(8.5);
  });

  it("validTo nulo = vigente por tempo indeterminado", () => {
    const prices = [price({ value: 8.5, validFrom: d("2020-01-01") })];
    expect(resolveMealPrice(prices, "emp-1", d("2030-05-05"))).toBeDefined();
  });

  it("individual expirado recai no global vigente", () => {
    const prices = [
      price({ value: 8.5, validFrom: d("2026-01-01") }),
      price({ value: 11, validFrom: d("2026-01-01"), validTo: d("2026-03-31"), employeeId: "emp-1" })
    ];
    expect(Number(resolveMealPrice(prices, "emp-1", d("2026-06-10"))!.value)).toBe(8.5);
  });

  it("troca de vigência no meio do período reflete por data", () => {
    const prices = [
      price({ value: 8.5, validFrom: d("2026-01-01") }),
      price({ value: 9.0, validFrom: d("2026-06-12") })
    ];
    expect(Number(resolveMealPrice(prices, "emp-1", d("2026-06-11"))!.value)).toBe(8.5);
    expect(Number(resolveMealPrice(prices, "emp-1", d("2026-06-12"))!.value)).toBe(9.0);
  });

  it("individual mais recente prevalece entre overrides", () => {
    const prices = [
      price({ value: 11, validFrom: d("2026-01-01"), employeeId: "emp-1" }),
      price({ value: 12, validFrom: d("2026-06-01"), employeeId: "emp-1" })
    ];
    expect(Number(resolveMealPrice(prices, "emp-1", d("2026-06-10"))!.value)).toBe(12);
  });

  it("sem preço aplicável retorna undefined (relatório usa 0)", () => {
    expect(resolveMealPrice([], "emp-1", d("2026-06-10"))).toBeUndefined();
  });
});

describe("roundCurrency", () => {
  it("arredonda para centavos", () => {
    expect(roundCurrency(8.555)).toBe(8.56);
    expect(roundCurrency(8.554)).toBe(8.55);
  });
});
