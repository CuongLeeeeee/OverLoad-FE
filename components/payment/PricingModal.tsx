"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, Loader2, Sparkles, Trophy, Star, Wallet } from "lucide-react";
import { paymentApi } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface PricingModalProps {
  onClose: () => void;
}

export default function PricingModal({ onClose }: PricingModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";

    const user = getUser();
    if (user) {
      paymentApi.getBalance()
        .then(res => setBalance(res.balance))
        .catch(err => console.error(err));
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted) return null;

  const handleUpgrade = async (packageType: "month" | "year") => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType);
    setError("");

    try {
      const fromPath = typeof window !== "undefined" ? window.location.pathname : "/";
      const res = await paymentApi.createProLink({
        packageType,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent(fromPath)}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent(fromPath)}`,
      });

      if (res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error("Không thể tạo liên kết thanh toán PRO.");
      }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi kết nối tới cổng thanh toán. Vui lòng thử lại.");
      setLoading(null);
    }
  };

  const handleUpgradeWithBalance = async (packageType: "month" | "year") => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType + "-balance");
    setError("");

    try {
      await paymentApi.buyProWithBalance({ packageType });
      onClose();
      router.replace(window.location.pathname + "?payment=success");
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi thanh toán bằng số dư. Vui lòng thử lại.");
      setLoading(null);
    }
  };

  const proFeatures = [
    "Mở khóa toàn bộ khóa học Premium nâng cao",
    "Học tương tác Scrollytelling & Visualizer",
    "Tải xuống toàn bộ mã nguồn dự án mẫu",
    "Hỗ trợ giải đáp thắc mắc 1:1 từ Giảng viên",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* Modal Box */}
      <div
        className="relative bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-3xl p-6 md:p-8 shadow-xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-150 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full mb-2.5">
            <Sparkles size={11} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600">Nâng cấp tài khoản PRO</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Nâng cấp tài khoản PRO
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Đầu tư một lần để mở khóa toàn bộ kiến thức lập trình tương tác nâng cao và tính năng đặc quyền.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-4 bg-red-50 border border-red-150 p-2.5 rounded-xl text-center">
            <p className="text-red-600 text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 gap-5 items-stretch mb-6">
          
          {/* Monthly Package */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col hover:shadow-sm transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gói 1 Tháng</h3>
                <p className="text-slate-400 text-[9px] mt-0.5">Mở khóa trải nghiệm ngắn hạn</p>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <Star size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">69.000đ</span>
              <span className="text-slate-400 text-xs">/ tháng</span>
            </div>

            <div className="space-y-2 mb-5 flex-1">
              {proFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-600">
                  <Check size={13} className="text-indigo-650 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleUpgrade("month")}
                disabled={loading !== null}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading === "month" && <Loader2 size={13} className="animate-spin" />}
                Bắt đầu gói Tháng
              </button>

              {balance !== null && (
                <button
                  onClick={() => handleUpgradeWithBalance("month")}
                  disabled={loading !== null || balance < 69000}
                  className="w-full py-2 rounded-xl border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-750 font-bold text-[10px] transition-all duration-250 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-indigo-600"
                >
                  {loading === "month-balance" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Wallet size={11} />
                  )}
                  {balance >= 69000 
                    ? `Dùng số dư ví (${balance.toLocaleString("vi-VN")}đ)`
                    : `Số dư không đủ (${balance.toLocaleString("vi-VN")}đ)`
                  }
                </button>
              )}
            </div>
          </div>

          {/* Yearly Package */}
          <div className="bg-indigo-50/15 border-2 border-indigo-500 rounded-2xl p-5 flex flex-col relative shadow-sm hover:shadow-md transition-all duration-300">
            {/* Tag */}
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-0.5">
              <Trophy size={8} fill="white" />
              Phổ biến nhất
            </div>

            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1">
                  Gói 1 Năm
                  <span className="text-[8px] bg-indigo-100 border border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                    -27%
                  </span>
                </h3>
                <p className="text-slate-500 text-[9px] mt-0.5">Lộ trình học tập trọn vẹn</p>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-xl border border-indigo-200">
                <Zap size={14} className="text-indigo-600 fill-indigo-600" />
              </div>
            </div>

            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-indigo-650">599.000đ</span>
              <span className="text-slate-400 text-xs">/ 12 tháng</span>
            </div>

            <div className="space-y-2 mb-5 flex-1">
              {proFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-700">
                  <Check size={13} className="text-indigo-650 flex-shrink-0" />
                  <span className="font-semibold text-slate-900">{feat}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleUpgrade("year")}
                disabled={loading !== null}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 disabled:opacity-50"
              >
                {loading === "year" && <Loader2 size={13} className="animate-spin text-white" />}
                Nâng cấp ngay
              </button>

              {balance !== null && (
                <button
                  onClick={() => handleUpgradeWithBalance("year")}
                  disabled={loading !== null || balance < 599000}
                  className="w-full py-2 rounded-xl border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-750 font-bold text-[10px] transition-all duration-250 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-indigo-600"
                >
                  {loading === "year-balance" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Wallet size={11} />
                  )}
                  {balance >= 599000 
                    ? `Dùng số dư ví (${balance.toLocaleString("vi-VN")}đ)`
                    : `Số dư không đủ (${balance.toLocaleString("vi-VN")}đ)`
                  }
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-slate-400 text-[9px] text-center md:text-left">
          <div>
            <p className="font-bold text-slate-500 mb-0.5">Thanh toán bảo mật qua cổng PayOS</p>
            <p>Học trực quan tức thì, không tự động gia hạn gói cước.</p>
          </div>
          <div className="flex gap-3 font-semibold text-slate-500">
            <div className="flex items-center gap-0.5">
              <Check size={11} />
              <span>Kích hoạt tự động</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Check size={11} />
              <span>Ví số dư an toàn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
