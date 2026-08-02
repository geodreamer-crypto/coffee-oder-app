import { describe, it, expect } from "vitest";
import { calculateOptionPrice, parseAvailableOptions } from "../src/lib/options";

describe("Starbucks-style Custom Options Test Suite", () => {
  it("should calculate correct option extra price from composite option string", () => {
    const optStr = "ICE | 1샷 추가(+500원) | 바닐라 시럽(+500원) | 오트 밀크(+500원)";
    const price = calculateOptionPrice(optStr);
    expect(price).toBe(1500);
  });

  it("should return 0 for option strings without extra charges or default choices", () => {
    const optStr = "ICE | 기본 샷 | 시럽 없음 | 저지방 우유";
    const price = calculateOptionPrice(optStr);
    expect(price).toBe(0);
  });

  it("should parse availableOptions JSON string correctly for ICE_ONLY menu", () => {
    const jsonStr = JSON.stringify({
      temperatures: ["ICE_ONLY"],
      shots: false,
      syrup: false,
      milk: false,
      whippedCream: false,
    });
    const config = parseAvailableOptions(jsonStr, "NON_COFFEE");
    expect(config.temperatures).toEqual(["ICE_ONLY"]);
    expect(config.shots).toBe(false);
  });

  it("should provide correct fallback defaults when availableOptions is null", () => {
    const configCoffee = parseAvailableOptions(null, "COFFEE");
    expect(configCoffee.temperatures).toEqual(["ICE", "HOT"]);
    expect(configCoffee.shots).toBe(true);
    expect(configCoffee.syrup).toBe(true);

    const configDessert = parseAvailableOptions(null, "DESSERT");
    expect(configDessert.temperatures).toEqual([]);
    expect(configDessert.shots).toBe(false);
  });
});
