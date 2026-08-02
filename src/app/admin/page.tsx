"use client";

import React, { useState, useTransition } from "react";
import useSWR from "swr";
import { OrderDTO } from "@/types/order";
import { updateOrderStatusAction, cancelOrderAction } from "@/actions/order-actions";
import { getErrorMessage } from "@/lib/errors";
import { SoundAlertManager } from "@/components/admin/SoundAlertManager";
import { Clock, CheckCircle2, PackageCheck, Utensils, XCircle, AlertCircle, RefreshCw, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { OptionBadge } from "@/components/ui/OptionBadge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPosPage() {
  const [filter, setFilter] = useState<string>("ACTIVE"); // ACTIVE | COMPLETED | CANCELLED | ALL
  const [isPending, startTransition] = useTransition();

  // 3s polling for orders
  const { data, error, isLoading, mutate } = useSWR<{ orders: OrderDTO[]; timestamp: number }>(
    "/api/admin/orders",
    fetcher,
    { refreshInterval: 3000 }
  );

  const orders = data?.orders || [];

  const filteredOrders = orders.filter((o) => {
    if (filter === "ACTIVE") return o.status === "PENDING" || o.status === "PREPARING";
    if (filter === "COMPLETED") return o.status === "COMPLETED" || o.status === "PICKED_UP";
    if (filter === "CANCELLED") return o.status === "CANCELLED";
    return true;
  });

  const handleUpdateStatus = (orderId: string, nextStatus: "PREPARING" | "COMPLETED" | "PICKED_UP") => {
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, nextStatus);
      if (res && "error" in res && res.error) {
        toast.error("상태 변경 실패", { description: getErrorMessage(res.error) });
        return;
      }
      toast.success(`주문 상태가 성공적으로 변경되었습니다 (${nextStatus})`);
      mutate();
    });
  };

  const handleCancelOrder = (orderId: string) => {
    if (!confirm("해당 주문을 강제 취소하고 재고를 원복하시겠습니까?")) return;
    startTransition(async () => {
      const res = await cancelOrderAction(orderId, "ADMIN");
      if (res && "error" in res && res.error) {
        toast.error("취소 실패", { description: getErrorMessage(res.error) });
        return;
      }
      toast.success("주문이 취소되고 차감되었던 재고가 100% 원복되었습니다.");
      mutate();
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 1. 접수 대기</span>;
      case "PREPARING":
        return <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse"><Utensils className="w-3.5 h-3.5" /> 2. 제조 중</span>;
      case "COMPLETED":
        return <span className="bg-green-500/20 border border-green-500/40 text-green-300 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 3. 제조 완료 (수령 대기)</span>;
      case "PICKED_UP":
        return <span className="bg-slate-800 border border-slate-700 text-slate-400 font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><PackageCheck className="w-3.5 h-3.5" /> 4. 수령 완료</span>;
      case "CANCELLED":
        return <span className="bg-red-500/20 border border-red-500/40 text-red-400 font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> 주문 취소 (재고원복)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <span>☕ 실시간 POS 주문 대기열</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            고객의 비회원 스마트 주문을 실시간(3초 Polling)으로 접수하고 제조/수령 단계로 신속하게 전환하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SoundAlertManager orders={orders} />
          {[
            { id: "ACTIVE", label: "🔥 진행 중 (Active)" },
            { id: "COMPLETED", label: "✅ 완료 내역" },
            { id: "CANCELLED", label: "🚫 취소 내역" },
            { id: "ALL", label: "✨ 전체" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === btn.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-900/50 border border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="w-full h-80 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-center p-8">
          <Layers className="w-16 h-16 text-slate-700 mb-3 stroke-[1.5]" />
          <p className="text-lg font-bold text-slate-400">선택한 조건에 일치하는 주문 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const isCancellable = order.status === "PENDING" || order.status === "PREPARING";
            return (
              <div
                key={order.id}
                className={`rounded-3xl p-6 border transition-all duration-300 shadow-xl ${
                  order.status === "PENDING"
                    ? "bg-slate-900/90 border-amber-500/40 shadow-amber-950/20 hover:border-amber-500"
                    : order.status === "PREPARING"
                    ? "bg-slate-900/90 border-blue-500/40 shadow-blue-950/20"
                    : "bg-slate-900/60 border-slate-800 opacity-80"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400 block">
                      #{order.orderNo}
                    </span>
                    <span className="text-sm font-black text-slate-200">
                      결제: <span className="text-amber-400">{order.paymentMethod}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                      {new Date(order.createdAt).toLocaleTimeString("ko-KR")}
                    </span>
                  </div>
                </div>

                {/* Items snapshot list */}
                <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80"
                    >
                      <div className="flex-1 mr-2">
                        <span className="font-bold text-sm text-slate-100 block">{item.menuName}</span>
                        <OptionBadge optionStr={item.option} size="sm" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-amber-400">
                          × {item.quantity}개
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {item.lineTotalAmount.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total amount and action controls */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-lg font-black font-mono text-amber-400">
                    총 {order.totalAmount.toLocaleString()}원
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isCancellable && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isPending}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 font-bold text-xs border border-slate-700 hover:border-red-500/40 transition-colors cursor-pointer"
                      >
                        취소(원복)
                      </button>
                    )}

                    {order.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "PREPARING")}
                        disabled={isPending}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>주문 승인 (제조 시작)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {order.status === "PREPARING" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                        disabled={isPending}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>제조 완료 (수령 대기)</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {order.status === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, "PICKED_UP")}
                        disabled={isPending}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>수령 확인 (종결)</span>
                        <PackageCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
