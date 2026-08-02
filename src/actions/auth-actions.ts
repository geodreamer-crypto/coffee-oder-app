"use server";

import { createAdminSession, removeAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAdminAction(pin: string, callbackUrl?: string) {
  const success = await createAdminSession(pin);
  if (!success) {
    return { error: "PIN 번호가 일치하지 않습니다. 다시 확인해주세요." };
  }
  redirect(callbackUrl || "/admin");
}

export async function logoutAdminAction() {
  await removeAdminSession();
  redirect("/admin/login");
}
