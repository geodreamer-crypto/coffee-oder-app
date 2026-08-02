"use server";

import { prisma } from "@/lib/prisma";
import { stockUpdateSchema } from "@/validators/menu-validator";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { ErrorCode } from "@/types/error";
import { revalidatePath } from "next/cache";

export async function updateStockAction(rawPayload: unknown) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  const parsed = stockUpdateSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { error: "INVALID_QUANTITY" as ErrorCode };
  }

  const { menuId, newStock } = parsed.data;

  try {
    const updatedMenu = await prisma.menu.update({
      where: { id: menuId },
      data: { stock: newStock },
    });

    revalidatePath("/");
    revalidatePath("/admin/inventory");
    return { success: true, data: updatedMenu };
  } catch (error) {
    console.error("updateStockAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}

export async function adjustStockAction(menuId: string, delta: number) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  try {
    const currentMenu = await prisma.menu.findUnique({ where: { id: menuId } });
    if (!currentMenu) return { error: "MENU_NOT_FOUND" as ErrorCode };

    const targetStock = Math.max(0, currentMenu.stock + delta);
    const updatedMenu = await prisma.menu.update({
      where: { id: menuId },
      data: { stock: targetStock },
    });

    revalidatePath("/");
    revalidatePath("/admin/inventory");
    return { success: true, data: updatedMenu };
  } catch (error) {
    console.error("adjustStockAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}
