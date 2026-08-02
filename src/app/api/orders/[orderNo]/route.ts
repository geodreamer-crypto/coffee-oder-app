import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const guestToken = request.nextUrl.searchParams.get("guestToken");

    if (!orderNo || !guestToken) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNo,
        guestToken,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      { order, timestamp: Date.now() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("API /orders/[orderNo] error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
