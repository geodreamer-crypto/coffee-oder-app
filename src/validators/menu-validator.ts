import { z } from "zod";

export const menuCreateSchema = z.object({
  name: z.string().min(1, "메뉴명을 입력해주세요."),
  price: z.number().int().min(0, "가격은 0 이상의 정수여야 합니다."),
  category: z.enum(["COFFEE", "NON_COFFEE", "DESSERT"]),
  initialStock: z.number().int().min(0, "초기 재고는 0 이상의 정수여야 합니다."),
  lowStockThreshold: z.number().int().min(0, "품절 임박 임계값은 0 이상이어야 합니다.").default(3),
  imageUrl: z.string().url("올바른 이미지 URL을 입력해주세요.").optional().or(z.literal("")),
  availableOptions: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const stockUpdateSchema = z.object({
  menuId: z.string().min(1),
  newStock: z.number().int().min(0, "재고는 0 이상의 정수만 허용됩니다."),
});

export type MenuCreatePayload = z.infer<typeof menuCreateSchema>;
export type StockUpdatePayload = z.infer<typeof stockUpdateSchema>;
