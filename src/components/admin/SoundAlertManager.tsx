"use client";

import React, { useEffect, useRef, useState } from "react";
import { OrderDTO } from "@/types/order";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

interface SoundAlertManagerProps {
  orders: OrderDTO[];
}

export const SoundAlertManager: React.FC<SoundAlertManagerProps> = ({ orders }) => {
  const [isMuted, setIsMuted] = useState(false);
  const prevOrderCountRef = useRef<number | null>(null);

  const playChime = () => {
    if (isMuted || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  useEffect(() => {
    const activePendingOrders = orders.filter((o) => o.status === "PENDING").length;

    if (prevOrderCountRef.current !== null && activePendingOrders > prevOrderCountRef.current) {
      playChime();
      toast.info("🛎️ 신규 주문이 인입되었습니다!", {
        description: "새로운 고객 주문을 확인하고 제조 승인을 진행하세요.",
        duration: 4000,
      });
    }

    prevOrderCountRef.current = activePendingOrders;
  }, [orders, isMuted]);

  return (
    <button
      type="button"
      onClick={() => setIsMuted(!isMuted)}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
        isMuted
          ? "bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 shadow-sm shadow-amber-500/10"
      }`}
      title={isMuted ? "알림음 켜기" : "알림음 끄기"}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />}
      <span>{isMuted ? "🔕 알림음 끔" : "🛎️ 실시간 소리 알림 ON"}</span>
    </button>
  );
};
