import { z } from "zod";

export const orderItemSchema = z.object({
  menuId: z.string().min(1, "메뉴 ID가 필요합니다."),
  option: z.string().optional().nullable(),
  quantity: z.number().int().positive("수량은 1 이상의 정수여야 합니다."),
});

export const orderRequestSchema = z.object({
  requestId: z.string().uuid("유효한 UUID 형태의 requestId가 필요합니다."),
  guestToken: z.string().min(10, "유효한 비회원 토큰이 필요합니다."),
  paymentMethod: z.enum(["CREDIT_CARD", "KAKAO_PAY", "CASH"], {
    message: "올바른 결제 수단을 선택해주세요.",
  }),
  items: z.array(orderItemSchema).min(1, "장바구니에 최소 1개 이상의 상품이 있어야 합니다."),
});

export type OrderRequestPayload = z.infer<typeof orderRequestSchema>;
