import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "coffee_admin_session";
const SESSION_SECRET = "secure_admin_token_2026_coffee_system_v1"; 

export async function createAdminSession(inputPin: string): Promise<boolean> {
  const expectedPin = process.env.ADMIN_PIN || "1234";
  if (inputPin === expectedPin) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, SESSION_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7일 유지
      path: "/",
      sameSite: "lax",
    });
    return true;
  }
  return false;
}

export async function removeAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return session === SESSION_SECRET;
}

export function isValidSessionToken(token?: string | null): boolean {
  return token === SESSION_SECRET;
}

export const AUTH_COOKIE_NAME = ADMIN_SESSION_COOKIE;
