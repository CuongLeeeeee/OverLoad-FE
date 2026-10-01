"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { paymentApi, refreshCurrentUser } from "@/lib/api";
import { TransactionStatus } from "@/lib/types";
import { PaymentResultStatus } from "./PaymentResultModal";

const STATUS_MAP: Record<TransactionStatus, PaymentResultStatus> = {
  Success: "success",
  Cancelled: "cancel",
  Pending: "pending",
};

const MAX_POLLS = 5;
const POLL_INTERVAL_MS = 2000;

// Chỉ cho quay về đường dẫn nội bộ
function safeFromPath(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

/**
 * Trang /payment/success và /payment/cancel: PayOS gắn `?orderCode=` vào URL →
 * hỏi BE trạng thái đơn (server tự hỏi lại PayOS nếu webhook chưa tới), làm mới
 * user nếu thành công, rồi quay về trang `from` kèm `?payment=<kết quả>`.
 */
export default function PaymentReturnHandler({ variant }: { variant: "success" | "cancel" }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const fromPath = safeFromPath(params.get("from"));
      const orderCode = params.get("orderCode");

      let result: PaymentResultStatus = variant === "cancel" ? "cancel" : "pending";

      if (orderCode) {
        try {
          for (let attempt = 1; attempt <= MAX_POLLS; attempt++) {
            const tx = await paymentApi.getOrder(orderCode);
            result = STATUS_MAP[tx.status] ?? result;
            // Trang cancel: một lần kiểm tra là đủ
            if (tx.status !== "Pending" || variant === "cancel" || attempt === MAX_POLLS) break;
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            if (cancelled) return;
          }
        } catch (err) {
          console.error("Không kiểm tra được trạng thái đơn hàng:", err);
        }
      }

      if (result === "success") {
        // Làm mới isPro / proExpiresAt của user đã lưu
        await refreshCurrentUser().catch(() => {});
      }

      if (cancelled) return;
      const url = new URL(fromPath, window.location.origin);
      url.searchParams.set("payment", result);
      router.replace(url.pathname + url.search);
    })();

    return () => { cancelled = true; };
  }, [router, variant]);

  return (
    <div className="min-h-screen bg-[#070d19] flex flex-col items-center justify-center gap-3">
      <Loader2 size={32} className={`animate-spin ${variant === "success" ? "text-emerald-500" : "text-rose-500"}`} />
      <p className="text-xs text-slate-400">Đang kiểm tra trạng thái thanh toán...</p>
    </div>
  );
}
