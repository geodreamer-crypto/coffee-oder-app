"use server";

import { prisma } from "@/lib/prisma";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { ErrorCode } from "@/types/error";
import { revalidatePath } from "next/cache";

export async function toggleStoreStatusAction(nextState?: boolean) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  try {
    const current = await prisma.storeSettings.findFirst();
    const targetState = nextState !== undefined ? nextState : !(current?.isOpen ?? true);

    const updated = await prisma.storeSettings.upsert({
      where: { id: 1 },
      update: { isOpen: targetState },
      create: { id: 1, isOpen: targetState },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, isOpen: updated.isOpen };
  } catch (error) {
    console.error("toggleStoreStatusAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}

export async function resetTestSystemAction(type: "STOCK" | "ORDERS") {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  if (process.env.NODE_ENV === "production") {
    return { error: "FORBIDDEN" as ErrorCode, message: "Production 환경에서는 데이터 초기화가 제한됩니다." };
  }

  try {
    if (type === "STOCK") {
      const menus = await prisma.menu.findMany();
      for (const menu of menus) {
        await prisma.menu.update({
          where: { id: menu.id },
          data: { stock: menu.initialStock },
        });
      }
    } else if (type === "ORDERS") {
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("resetTestSystemAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}
