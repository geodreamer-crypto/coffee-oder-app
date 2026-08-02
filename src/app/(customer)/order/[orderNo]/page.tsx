"use client";

import React, { useState, useTransition, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { OrderDTO } from "@/types/order";
import { useCartStore } from "@/store/use-cart-store";
import { cancelOrderAction } from "@/actions/order-actions";
import { getErrorMessage } from "@/lib/errors";
import { Coffee, Clock, CheckCircle2, AlertCircle, ArrowLeft, XCircle, PackageCheck, Utensils } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { OptionBadge } from "@/components/ui/OptionBadge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function OrderTrackingContent({ params }: { params: Promise<{ orderNo: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orderNo } = use(params);
  const { guestToken: storeToken, clearOrderTracking } = useCartStore();

  const guestToken = searchParams?.get("guestToken") || storeToken || "";
  const [isCancelling, startTransition] = useTransition();

  // SWR 3 seconds polling
  const { data, error, isLoading, mutate } = useSWR<{ order: OrderDTO }>(
    guestToken ? `/api/orders/${orderNo}?guestToken=${guestToken}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  if (!guestToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">비회원 인증 토큰(GuestToken) 없음</h2>
          <p className="text-sm text-slate-400 mt-2">
            해당 기기에서 주문을 찾을 수 없거나 브라우저 토큰이 소유되지 않았습니다.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block w-full py-3.5 bg-amber-500 font-bold text-slate-950 rounded-2xl hover:bg-amber-400 transition-colors"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">주문 상태 실시간 모니터링 로딩 중...</p>
      </div>
    );
  }

  if (!data || error || "error" in data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-200">주문 내역을 찾을 수 없습니다</h2>
          <p className="text-sm text-slate-400 mt-2">
            요구된 주문 번호({orderNo}) 또는 토큰이 유효하지 않습니다.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block w-full py-3.5 bg-amber-500 font-bold text-slate-950 rounded-2xl hover:bg-amber-400 transition-colors"
          >
            메인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const order = data.order;
  const status = order.status;

  const steps = [
    { key: "PENDING", label: "접수 대기", icon: Clock, desc: "주문을 접수하고 대기 중입니다" },
    { key: "PREPARING", label: "제조 중", icon: Utensils, desc: "맛있는 기운을 담아 음료를 제조 중입니다" },
    { key: "COMPLETED", label: "제조 완료", icon: CheckCircle2, desc: "제조가 완료되었습니다! 카운터에서 수령해주세요" },
    { key: "PICKED_UP", label: "수령 완료", icon: PackageCheck, desc: "맛있게 드세요! 감사합니다" },
  ];

  const getStepIndex = (s: string) => {
    if (s === "CANCELLED") return -1;
    return steps.findIndex((x) => x.key === s);
  };

  const currentStepIdx = getStepIndex(status);

  const handleGuestCancel = () => {
    startTransition(async () => {
      const res = await cancelOrderAction(order.id, "GUEST");
      if (res && "error" in res && res.error) {
        toast.error("주문 취소 실패", { description: getErrorMessage(res.error) });
        return;
      }
      toast.success("주문이 성공적으로 취소되었습니다. 재고가 즉시 원복되었습니다.");
      clearOrderTracking();
      mutate();
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 py-10 px-4 flex flex-col items-center">
      {/* Top Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <Link
          href="/"
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-slate-300 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>메인 메뉴로 돌아가기</span>
        </Link>
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          3초 주기 준실시간 Polling 중
        </div>
      </div>

      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {status === "CANCELLED" ? (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 text-center mb-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3 animate-bounce" />
            <h2 className="text-2xl font-black text-red-300">주문이 취소되었습니다 (CANCELLED)</h2>
            <p className="text-sm text-red-400/80 mt-1">
              고객 변심 또는 매장 품절/사정에 의해 주문이 취소되었습니다.<br />
              취소와 동시에 결제 트랜잭션 수량만큼 재고가 100% 자동 원복되었습니다.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <span className="text-amber-400 text-xs font-extrabold font-mono uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-block mb-3">
                ORDER #{order.orderNo}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
                {status === "PENDING"
                  ? "☕ 주문이 접수되어 승인 대기 중입니다."
                  : status === "PREPARING"
                  ? "🔥 바리스타가 정성껏 음료를 제조 중입니다."
                  : status === "COMPLETED"
                  ? "🎉 제조가 완료되었습니다! 카운터로 와주세요!"
                  : "🤝 음료 수령이 완료되었습니다. 감사합니다!"}
              </h2>
            </div>

            <div className="mb-10 px-2 sm:px-6">
              <div className="relative flex justify-between">
                <div className="absolute top-7 left-8 right-8 h-1 bg-slate-800 -z-0">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                    style={{
                      width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = currentStepIdx > idx;
                  const isCurrent = currentStepIdx === idx;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10 w-20 text-center">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                          isCurrent
                            ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 border-white shadow-xl shadow-amber-500/30 scale-110 animate-bounce"
                            : isDone
                            ? "bg-slate-800 text-amber-400 border-amber-500/40"
                            : "bg-slate-950 text-slate-600 border-slate-800"
                        }`}
                      >
                        <Icon className="w-6 h-6 font-bold" />
                      </div>
                      <span className={`text-xs font-bold mt-3 ${isCurrent ? "text-amber-300 font-extrabold" : "text-slate-400"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 mb-4">
            주문 스냅샷 내역 (Snapshot Record)
          </h3>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-900 last:border-0">
                <div className="flex-1 mr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{item.menuName}</span>
                    <span className="text-xs font-mono font-semibold text-slate-400">× {item.quantity}</span>
                  </div>
                  <OptionBadge optionStr={item.option} size="sm" />
                </div>
                <span className="font-mono font-bold text-amber-400">
                  {item.lineTotalAmount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-base font-bold">
            <span className="text-slate-400">결제 방식: {order.paymentMethod}</span>
            <span className="text-xl font-mono text-amber-400 font-black">
              총 {order.totalAmount.toLocaleString()}원
            </span>
          </div>
        </div>

        {status === "PENDING" && (
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-4">
              * 현재 <span className="text-amber-400 font-bold">접수 대기(PENDING)</span> 단계이므로 고객님께서 직접 주문을 취소할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={handleGuestCancel}
              disabled={isCancelling}
              className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-extrabold text-base rounded-2xl transition-all duration-200 shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isCancelling ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>주문 취소 및 재고 즉각 원복하기</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-amber-400/80 hover:text-amber-300 underline underline-offset-4"
          >
            추가로 더 주문하시겠어요? 메인으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({ params }: { params: Promise<{ orderNo: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-amber-400 flex flex-col items-center justify-center font-bold font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>주문 조회 화면 로딩 중...</span>
      </div>
    }>
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}
