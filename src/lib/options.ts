export interface MenuOptionConfig {
  temperatures?: ("ICE" | "HOT" | "ICE_ONLY")[];
  shots?: boolean;
  syrup?: boolean;
  milk?: boolean;
  whippedCream?: boolean;
}

export interface SelectedOptions {
  temperature?: string;
  shot?: string;
  syrup?: string;
  milk?: string;
  whippedCream?: string;
}

export const OPTION_DEFINITIONS = {
  shots: [
    { label: "기본 샷", price: 0 },
    { label: "연하게", price: 0 },
    { label: "1샷 추가(+500원)", price: 500 },
    { label: "2샷 추가(+1,000원)", price: 1000 },
  ],
  syrups: [
    { label: "시럽 없음", price: 0 },
    { label: "바닐라 시럽(+500원)", price: 500 },
    { label: "헤이즐넛 시럽(+500원)", price: 500 },
    { label: "카라멜 시럽(+500원)", price: 500 },
  ],
  milks: [
    { label: "기본 우유", price: 0 },
    { label: "저지방 우유", price: 0 },
    { label: "오트 밀크(+500원)", price: 500 },
    { label: "아몬드 밀크(+500원)", price: 500 },
  ],
  whippedCreams: [
    { label: "휘핑 없음", price: 0 },
    { label: "휘핑 추가(+500원)", price: 500 },
    { label: "휘핑 많이(+500원)", price: 500 },
  ],
};

/**
 * 옵션 문자열에서 "(+500원)", "(+1,000원)" 등을 인식하여 총 옵션 추가 금액을 산출합니다.
 */
export function calculateOptionPrice(optionStr?: string | null): number {
  if (!optionStr) return 0;
  const matches = optionStr.matchAll(/\(\+([0-9,]+)원\)/g);
  let total = 0;
  for (const match of matches) {
    const price = parseInt(match[1].replace(/,/g, ""), 10);
    if (!isNaN(price)) {
      total += price;
    }
  }
  return total;
}

/**
 * DB에 저장된 availableOptions JSON 문자열을 파싱하여 안전한 설정 객체로 변환합니다.
 */
export function parseAvailableOptions(
  availableOptionsJson?: string | null,
  category?: string
): MenuOptionConfig {
  if (availableOptionsJson) {
    try {
      const parsed = JSON.parse(availableOptionsJson);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as MenuOptionConfig;
      }
    } catch (e) {
      console.error("parseAvailableOptions error:", e);
    }
  }

  // Fallback defaults
  if (category === "DESSERT") {
    return {
      temperatures: [],
      shots: false,
      syrup: false,
      milk: false,
      whippedCream: false,
    };
  }
  if (category === "COFFEE") {
    return {
      temperatures: ["ICE", "HOT"],
      shots: true,
      syrup: true,
      milk: true,
      whippedCream: false,
    };
  }
  return {
    temperatures: ["ICE", "HOT"],
    shots: false,
    syrup: false,
    milk: false,
    whippedCream: false,
  };
}
