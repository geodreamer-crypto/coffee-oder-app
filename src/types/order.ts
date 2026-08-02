import { TemperatureOption } from "./menu";

export type OrderStatus = "PENDING" | "PREPARING" | "COMPLETED" | "PICKED_UP" | "CANCELLED";
export type PaymentMethod = "CREDIT_CARD" | "KAKAO_PAY" | "CASH";

export interface OrderItemDTO {
  id: string;
  orderId: string;
  menuId: string;
  menuName: string;
  option: string | null;
  quantity: number;
  unitPrice: number;
  lineTotalAmount: number;
}

export interface OrderDTO {
  id: string;
  orderNo: string;
  requestId: string;
  guestToken: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  cancelledAt?: string | Date | null;
  completedAt?: string | Date | null;
  pickedUpAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  items?: OrderItemDTO[];
}

export interface CartItem {
  cartItemId: string; // `${menuId}-${option || 'none'}`
  menuId: string;
  menuName: string;
  option?: string | null;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
  stock: number; // 참고용 현재 남은 재고
}
