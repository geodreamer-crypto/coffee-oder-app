export type ErrorCode =
  | "UNAUTHORIZED"              // 관리자 로그인 필요
  | "FORBIDDEN"                 // 접근 권한 부족
  | "STORE_CLOSED"              // 매장 영업 종료(주문 마감) 상태
  | "MENU_NOT_FOUND"            // 존재하지 않는 메뉴 아이디
  | "MENU_NOT_ACTIVE"           // 판매 중단 처리된 메뉴
  | "INVALID_OPTION"            // 잘못된 온도 옵션 (예: 디저트에 HOT 요청 등)
  | "INVALID_QUANTITY"          // 1 미만 또는 허용 범위를 넘은 비정상 수량
  | "STOCK_NOT_ENOUGH"          // 남은 재고 수량 부족 (동시성 품절 포함)
  | "ORDER_NOT_FOUND"           // 존재하지 않거나 일치하지 않는 주문 식별자
  | "ORDER_ALREADY_EXISTS"      // 중복 요청 ID (requestId 충돌)
  | "INVALID_ORDER_STATUS"      // 허용되지 않은 상태 전이 시도
  | "ORDER_CANNOT_BE_CANCELLED" // 이미 완성되었거나 취소할 수 없는 주문 상태
  | "INTERNAL_SERVER_ERROR";    // 기타 서버 시스템 예외
