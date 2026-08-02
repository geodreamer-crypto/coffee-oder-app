import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { prisma } from "../src/lib/prisma";
import { createOrderAction, cancelOrderAction } from "../src/actions/order-actions";

describe("Order Idempotency and Atomic Inventory Deduction Tests", () => {
  let testMenuId: string;
  const validRequestId1 = "11111111-1111-4111-8111-111111111111";
  const validRequestId2 = "22222222-2222-4222-8222-222222222222";

  beforeAll(async () => {
    await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: { isOpen: true },
      create: { id: 1, isOpen: true },
    });

    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});

    const menu = await prisma.menu.findFirst();
    if (!menu) {
      throw new Error("No menu item found. Please run seed script before tests.");
    }
    testMenuId = menu.id;

    await prisma.menu.update({
      where: { id: testMenuId },
      data: { stock: 10, isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. Should successfully create an order and deduct stock atomically", async () => {
    const guestToken = "guest_test_token_01";

    const res = await createOrderAction({
      requestId: validRequestId1,
      guestToken,
      paymentMethod: "CREDIT_CARD",
      items: [{ menuId: testMenuId, quantity: 2, option: "ICE" }],
    });

    expect(res.error).toBeUndefined();
    expect(res.success).toBe(true);
    expect(res.isDuplicate).toBe(false);

    const updatedMenu = await prisma.menu.findUniqueOrThrow({ where: { id: testMenuId } });
    expect(updatedMenu.stock).toBe(8);
  });

  it("2. Should guarantee Idempotency (prevent double deduction on retry with same requestId)", async () => {
    const guestToken = "guest_test_token_01";

    const res = await createOrderAction({
      requestId: validRequestId1, // SAME requestId as above
      guestToken,
      paymentMethod: "CREDIT_CARD",
      items: [{ menuId: testMenuId, quantity: 2, option: "ICE" }],
    });

    expect(res.success).toBe(true);
    expect(res.isDuplicate).toBe(true);

    const updatedMenu = await prisma.menu.findUniqueOrThrow({ where: { id: testMenuId } });
    expect(updatedMenu.stock).toBe(8);
  });

  it("3. Should block order and rollback transaction when requesting more than available stock", async () => {
    const res = await createOrderAction({
      requestId: validRequestId2,
      guestToken: "guest_test_token_02",
      paymentMethod: "CASH",
      items: [{ menuId: testMenuId, quantity: 20, option: "HOT" }],
    });

    expect(res.error).toBe(`STOCK_NOT_ENOUGH:${testMenuId}`);

    const updatedMenu = await prisma.menu.findUniqueOrThrow({ where: { id: testMenuId } });
    expect(updatedMenu.stock).toBe(8);
  });

  it("4. Should restore stock to original value when order is cancelled", async () => {
    const order = await prisma.order.findUniqueOrThrow({
      where: { requestId: validRequestId1 },
    });

    const res = await cancelOrderAction(order.id, "GUEST");
    expect(res.success).toBe(true);

    const updatedMenu = await prisma.menu.findUniqueOrThrow({ where: { id: testMenuId } });
    expect(updatedMenu.stock).toBe(10);
  });
});
