// Testes puros de datas e jornada (sem banco).
import { describe, expect, it } from "vitest";
import { isExpectedWorkday, parseDate } from "../../src/lib/dates.js";
import { assertNoFutureDates, isFutureDate } from "../../src/services/date-rules.js";

describe("isExpectedWorkday", () => {
  it("MON_FRI: dia útil sim, fim de semana não", () => {
    // 2026-06-10 = quarta, 2026-06-13 = sábado, 2026-06-14 = domingo
    expect(isExpectedWorkday(parseDate("2026-06-10"), "MON_FRI")).toBe(true);
    expect(isExpectedWorkday(parseDate("2026-06-13"), "MON_FRI")).toBe(false);
    expect(isExpectedWorkday(parseDate("2026-06-14"), "MON_FRI")).toBe(false);
  });

  it("MON_SUN e CUSTOM sem dias explícitos: todo dia é esperado", () => {
    expect(isExpectedWorkday(parseDate("2026-06-14"), "MON_SUN")).toBe(true);
    expect(isExpectedWorkday(parseDate("2026-06-14"), "CUSTOM")).toBe(true);
    expect(isExpectedWorkday(parseDate("2026-06-14"), "CUSTOM", null)).toBe(true);
  });

  it("CUSTOM com dias explícitos seg–sáb: domingo não, segunda sim", () => {
    // 2026-06-14 = domingo, 2026-06-15 = segunda
    expect(isExpectedWorkday(parseDate("2026-06-14"), "CUSTOM", "1,2,3,4,5,6")).toBe(false);
    expect(isExpectedWorkday(parseDate("2026-06-15"), "CUSTOM", "1,2,3,4,5,6")).toBe(true);
  });

  it("dias explícitos valem para qualquer scheduleType e ignoram lixo", () => {
    expect(isExpectedWorkday(parseDate("2026-06-14"), "MON_FRI", "0")).toBe(true);
    expect(isExpectedWorkday(parseDate("2026-06-15"), "MON_FRI", "0")).toBe(false);
    expect(isExpectedWorkday(parseDate("2026-06-15"), "MON_FRI", "xx,,")).toBe(true);
  });
});

describe("regras de data futura", () => {
  it("isFutureDate: passado remoto false, futuro remoto true", () => {
    expect(isFutureDate(parseDate("2020-01-01"))).toBe(false);
    expect(isFutureDate(parseDate("2099-01-01"))).toBe(true);
  });

  it("assertNoFutureDates lista inválidas sem duplicar", () => {
    const ok = assertNoFutureDates([parseDate("2020-01-01")]);
    expect(ok).toEqual({ ok: true, invalidDates: [] });

    const bad = assertNoFutureDates([parseDate("2099-01-02"), parseDate("2020-01-01"), parseDate("2099-01-02")]);
    expect(bad).toEqual({ ok: false, invalidDates: ["2099-01-02"] });
  });
});
