"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/use-cart-store";
import { createOrderAction } from "@/actions/order-actions";
import { getErrorMessage } from "@/lib/errors";
import { X, Trash2, Minus, Plus, CreditCard, DollarSign, Smartphone, ShoppingBag, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { OptionBadge } from "@/components/ui/OptionBadge";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, setOrderTracking, guestToken: existingToken } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<"CREDIT_CARD" | "KAKAO_PAY" | "CASH">("CREDIT_CARD");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("장바구니가 비어있습니다.");
      return;
    }

    startTransition(async () => {
      const requestId = crypto.randomUUID();
      const guestToken = existingToken || `gt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        requestId,
        guestToken,
        paymentMethod,
        items: items.map((i) => ({
          menuId: i.menuId,
          option: i.option || null,
          quantity: i.quantity,
        })),
      };

      const res = await createOrderAction(payload);

      if (res && "error" in res && res.error) {
        toast.error("주문 실패", {
          description: getErrorMessage(res.error),
          duration: 4000,
        });
        return;
      }

      if (res && "success" in res && res.data) {
        setOrderTracking(res.data.orderNo, guestToken);
        clearCart();
        toast.success("🎉 주문 및 가상 결제가 완료되었습니다!", {
          description: `주문 번호: ${res.data.orderNo}`,
          duration: 3000,
        });
        onClose();
        router.push(`/order/${res.data.orderNo}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg text-slate-100">장바구니</h2>
            <span className="bg-amber-500/20 text-amber-400 font-bold text-xs px-2.5 py-0.5 rounded-full">
              {items.length}종
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="장바구니 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 my-12">
              <ShoppingBag className="w-16 h-16 stroke-[1.5] text-slate-700 mb-3" />
              <p className="text-base font-medium">장바구니가 비어 있습니다.</p>
              <p className="text-xs text-slate-600 mt-1">맛있는 커피와 디저트를 담아보세요!</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  전체 비우기
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex gap-3 relative"
                >
                  <img
                    src={item.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
                    alt={item.menuName}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-200 truncate">{item.menuName}</h4>
                    <OptionBadge optionStr={item.option} size="sm" />
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-amber-400 font-mono text-sm">
                        {(item.unitPrice * item.quantity).toLocaleString()}원
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-sm text-slate-200 w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity >= item.stock) {
                              toast.warning(`남은 재고 상한(${item.stock}개)에 도달했습니다.`);
                            } else {
                              updateQuantity(item.cartItemId, item.quantity + 1);
                            }
                          }}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer with Mock Payment & Submit */}
        {items.length > 0 && (
          <div className="p-5 bg-slate-950/90 border-t border-slate-800 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                가상 결제 수단 선택 (Mock Simulation)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CREDIT_CARD", label: "신용카드", icon: CreditCard },
                  { id: "KAKAO_PAY", label: "카카오페이", icon: Smartphone },
                  { id: "CASH", label: "현금", icon: DollarSign },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">총 결제 예정 금액</span>
              <span className="text-2xl font-extrabold font-mono text-amber-400">
                {totalAmount.toLocaleString()}원
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-base rounded-2xl transition-all duration-200 transform active:scale-95 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <div className="w-6 h-6 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{totalAmount.toLocaleString()}원 결제 및 주문하기</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500">
              🔒 트랜잭션 멱등성 검증 및 실시간 잔여 재고 원자적 차감 보장
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
