"use server";

import { prisma } from "@/lib/prisma";
import { orderRequestSchema } from "@/validators/order-validator";
import { ErrorCode } from "@/types/error";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateOptionPrice } from "@/lib/options";

export async function createOrderAction(rawPayload: unknown) {
  const parsed = orderRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { error: "INVALID_QUANTITY" as ErrorCode, details: parsed.error.format() };
  }

  const { requestId, guestToken, paymentMethod, items } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 멱등성 검증: 동일 requestId 재전송인지 체크
      const existingOrder = await tx.order.findUnique({
        where: { requestId },
        include: { items: true },
      });
      if (existingOrder) {
        return { order: existingOrder, isDuplicate: true };
      }

      // 2. 매장 영업 중 여부 검증
      const store = await tx.storeSettings.findFirst();
      if (!store || !store.isOpen) {
        throw new Error("STORE_CLOSED");
      }

      let calculatedTotal = 0;
      const snapshotItems: {
        menuId: string;
        menuName: string;
        option: string | null;
        quantity: number;
        unitPrice: number;
        lineTotalAmount: number;
      }[] = [];

      // 3. 각 메뉴별 조건부 재고 원자적 차감 및 스냅샷 보존
      for (const item of items) {
        const updateResult = await tx.menu.updateMany({
          where: {
            id: item.menuId,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // 차감된 행이 0개라면 재고 부족 혹은 판매중단 상태이므로 Rollback
        if (updateResult.count === 0) {
          throw new Error(`STOCK_NOT_ENOUGH:${item.menuId}`);
        }

        const menu = await tx.menu.findUniqueOrThrow({ where: { id: item.menuId } });
        const optionPrice = calculateOptionPrice(item.option);
        const unitPrice = menu.price + optionPrice;
        const lineTotal = unitPrice * item.quantity;
        calculatedTotal += lineTotal;

        snapshotItems.push({
          menuId: menu.id,
          menuName: menu.name,
          option: item.option || null,
          quantity: item.quantity,
          unitPrice: unitPrice,
          lineTotalAmount: lineTotal,
        });
      }

      // 4. 주문 및 스냅샷 레코드 저장
      const createdOrder = await tx.order.create({
        data: {
          orderNo: `ord_${Date.now().toString().slice(-6)}_${Math.floor(100 + Math.random() * 900)}`,
          requestId,
          guestToken,
          status: "PENDING",
          paymentMethod,
          totalAmount: calculatedTotal,
          items: {
            create: snapshotItems,
          },
        },
        include: { items: true },
      });

      return { order: createdOrder, isDuplicate: false };
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, data: result.order, isDuplicate: result.isDuplicate };
  } catch (error: any) {
    if (error?.message?.startsWith("STOCK_NOT_ENOUGH:")) {
      return { error: error.message as ErrorCode };
    }
    if (error?.message === "STORE_CLOSED") {
      return { error: "STORE_CLOSED" as ErrorCode };
    }
    console.error("createOrderAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}

export async function cancelOrderAction(orderId: string, requestRole: "ADMIN" | "GUEST" = "ADMIN") {
  try {
    if (requestRole === "ADMIN") {
      const isAdmin = await isAuthenticatedAdmin();
      if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };
    }

    await prisma.$transaction(async (tx) => {
      // GUEST는 PENDING만, ADMIN은 PREPARING까지 취소 허용
      const allowedStatuses = requestRole === "GUEST" ? ["PENDING"] : ["PENDING", "PREPARING"];

      const updateOrder = await tx.order.updateMany({
        where: { id: orderId, status: { in: allowedStatuses } },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      if (updateOrder.count === 0) {
        throw new Error("ORDER_CANNOT_BE_CANCELLED");
      }

      // 주문에 포함되었던 각 메뉴 항목 수량만큼 원자적 재고 원복
      const orderItems = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of orderItems) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    if (error?.message === "ORDER_CANNOT_BE_CANCELLED") {
      return { error: "ORDER_CANNOT_BE_CANCELLED" as ErrorCode };
    }
    console.error("cancelOrderAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}

export async function updateOrderStatusAction(orderId: string, nextStatus: "PREPARING" | "COMPLETED" | "PICKED_UP") {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  try {
    const updateData: any = { status: nextStatus };
    if (nextStatus === "COMPLETED") updateData.completedAt = new Date();
    if (nextStatus === "PICKED_UP") updateData.pickedUpAt = new Date();

    await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("updateOrderStatusAction error:", error);
    return { error: "INVALID_ORDER_STATUS" as ErrorCode };
  }
}
