import { ErrorCode } from "@/types/error";

const errorMessageMap: Record<ErrorCode, string> = {
  UNAUTHORIZED: "관리자 로그인이 필요한 서비스입니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  STORE_CLOSED: "현재 매장이 영업 마감(주문 종료) 상태입니다. 주문할 수 없습니다.",
  MENU_NOT_FOUND: "요청하신 메뉴 정보를 찾을 수 없습니다.",
  MENU_NOT_ACTIVE: "판매 중단되어 더 이상 주문할 수 없는 메뉴가 포함되어 있습니다.",
  INVALID_OPTION: "선택 불가능한 옵션(예: 디저트에 온도 옵션)이 요청되었습니다.",
  INVALID_QUANTITY: "주문 수량은 1 이상 남은 재고 이하의 정수여야 합니다.",
  STOCK_NOT_ENOUGH: "재고가 소진되었거나 선택하신 수량보다 부족합니다. 주문을 완료할 수 없습니다.",
  ORDER_NOT_FOUND: "주문 정보를 찾을 수 없습니다.",
  ORDER_ALREADY_EXISTS: "이미 처리된 주문 요청입니다.",
  INVALID_ORDER_STATUS: "해당 주문 단계에서는 변경할 수 없는 상태입니다.",
  ORDER_CANNOT_BE_CANCELLED: "이미 조리 완료되었거나 수령 완료되어 주문을 취소할 수 없습니다.",
  INTERNAL_SERVER_ERROR: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

export function getErrorMessage(code: ErrorCode | string, defaultMsg = "알 수 없는 오류가 발생했습니다."): string {
  if (typeof code === "string" && code.startsWith("STOCK_NOT_ENOUGH:")) {
    const parts = code.split(":");
    return `방금 선택하신 메뉴의 재고가 품절 또는 소진되었습니다. (ID: ${parts[1]})`;
  }
  if (code in errorMessageMap) {
    return errorMessageMap[code as ErrorCode];
  }
  return typeof code === "string" && code.length > 0 ? code : defaultMsg;
}
