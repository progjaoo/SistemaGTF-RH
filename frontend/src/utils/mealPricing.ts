import type { MealPrice } from "../types";

export function resolveMealPrice(prices: MealPrice[], employeeId: string, date: string) {
  const validPrices = prices
    .filter((price) => price.validFrom <= date && (!price.validTo || price.validTo >= date))
    .sort((first, second) => second.validFrom.localeCompare(first.validFrom));

  return (
    validPrices.find((price) => price.employeeId === employeeId) ??
    validPrices.find((price) => price.employeeId === null) ??
    null
  );
}
