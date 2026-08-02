"use server";

import { prisma } from "@/lib/prisma";
import { menuCreateSchema } from "@/validators/menu-validator";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { ErrorCode } from "@/types/error";
import { revalidatePath } from "next/cache";

export async function createMenuAction(rawPayload: unknown) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  const parsed = menuCreateSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode, details: parsed.error.format() };
  }

  const data = parsed.data;

  try {
    const newMenu = await prisma.menu.create({
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        stock: data.initialStock,
        initialStock: data.initialStock,
        lowStockThreshold: data.lowStockThreshold,
        imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
        availableOptions: data.availableOptions || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/menus");
    revalidatePath("/admin/inventory");
    return { success: true, data: newMenu };
  } catch (error) {
    console.error("createMenuAction error:", error);
    return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };
  }
}

export async function updateMenuAction(menuId: string, rawPayload: unknown) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  const parsed = menuCreateSchema.partial().safeParse(rawPayload);
  if (!parsed.success) return { error: "INTERNAL_SERVER_ERROR" as ErrorCode };

  try {
    const updated = await prisma.menu.update({
      where: { id: menuId },
      data: parsed.data,
    });

    revalidatePath("/");
    revalidatePath("/admin/menus");
    return { success: true, data: updated };
  } catch (error) {
    return { error: "MENU_NOT_FOUND" as ErrorCode };
  }
}

export async function toggleMenuActiveAction(menuId: string, currentStatus: boolean) {
  const isAdmin = await isAuthenticatedAdmin();
  if (!isAdmin) return { error: "UNAUTHORIZED" as ErrorCode };

  try {
    const updated = await prisma.menu.update({
      where: { id: menuId },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/");
    revalidatePath("/admin/menus");
    return { success: true, data: updated };
  } catch (error) {
    return { error: "MENU_NOT_FOUND" as ErrorCode };
  }
}
