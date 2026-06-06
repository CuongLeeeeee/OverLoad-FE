"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Zap, Loader2, Sparkles, Trophy, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { paymentApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import PaymentResultModal from "@/components/payment/PaymentResultModal";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<"success" | "cancel" | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);

    const user = getUser();
    if (user) {
      paymentApi.getBalance()
        .then(res => setBalance(res.balance))
        .catch(err => console.error(err));
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const payStatus = params.get("payment");
      if (payStatus === "success" || payStatus === "cancel") {
        setPaymentResult(payStatus);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleUpgrade = async (packageType: "month" | "year") => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType);
    setError("");

    try {
      const res = await paymentApi.createProLink({
        packageType,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent("/pricing")}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent("/pricing")}`,
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
      setPaymentResult("success");
      const updatedBalance = await paymentApi.getBalance();
      setBalance(updatedBalance.balance);
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi thanh toán bằng số dư. Vui lòng thử lại.");
    } finally {
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 relative overflow-hidden flex flex-col items-center py-12 px-4 select-none">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-50 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại Trang chủ
        </Link>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
          <Sparkles size={14} className="text-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600">Nâng cấp để bứt phá giới hạn</span>
        </div>
      </div>

      {/* Main Intro */}
      <div className="text-center max-w-2xl mb-10 z-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
          Nâng cấp tài khoản PRO
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Đầu tư một lần, mở khóa toàn bộ kho tàng kiến thức nâng cao. Đạt được mục tiêu nghề nghiệp nhanh gấp đôi.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-md mb-6 bg-red-50 border border-red-200 p-4 rounded-2xl text-center z-10">
          <p className="text-red-650 text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Pricing Cards Container */}
      <div className="w-full max-w-3xl grid md:grid-cols-2 gap-6 mb-12 z-10 items-stretch">
        
        {/* Package 1: Monthly */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col hover:shadow-md transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Gói 1 Tháng</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Trải nghiệm không giới hạn</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
              <Star size={18} className="text-slate-400" />
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">69.000đ</span>
            <span className="text-slate-400 text-xs">/ tháng</span>
          </div>

          <div className="space-y-3 mb-6 flex-1">
            {proFeatures.map((feat, idx) => (
              <div key={idx} className="flex gap-2.5 items-center text-xs text-slate-650">
                <Check size={14} className="text-indigo-600 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleUpgrade("month")}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading === "month" && <Loader2 size={14} className="animate-spin" />}
              Bắt đầu gói Tháng
            </button>

            {balance !== null && (
              <button
                onClick={() => handleUpgradeWithBalance("month")}
                disabled={loading !== null || balance < 69000}
                className="w-full py-2.5 rounded-xl border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-750 font-bold text-[10px] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {loading === "month-balance" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Wallet size={12} />
                )}
                {balance >= 69000 
                  ? `Dùng số dư ví (${balance.toLocaleString("vi-VN")}đ)`
                  : `Số dư không đủ (${balance.toLocaleString("vi-VN")}đ)`
                }
              </button>
            )}
          </div>
        </div>

        {/* Package 2: Yearly (Recommended) */}
        <div className="bg-indigo-50/10 border-2 border-indigo-500 rounded-3xl p-6 flex flex-col relative shadow-sm hover:shadow-md transition-all duration-300 group">
          {/* Popular Tag */}
          <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-1">
            <Trophy size={10} fill="white" />
            Phổ biến nhất
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                Gói 1 Năm
                <span className="text-[9px] bg-indigo-100 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                  Tiết kiệm 27%
                </span>
              </h3>
              <p className="text-slate-500 text-[10px] mt-0.5">Lộ trình đột phá toàn diện</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
              <Zap size={18} className="text-indigo-600 fill-indigo-600" />
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-indigo-600">599.000đ</span>
            <span className="text-slate-400 text-xs">/ 12 tháng</span>
          </div>

          <div className="space-y-3 mb-6 flex-1">
            {proFeatures.map((feat, idx) => (
              <div key={idx} className="flex gap-2.5 items-center text-xs text-slate-700">
                <Check size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-slate-900">{feat}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleUpgrade("year")}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
            >
              {loading === "year" && <Loader2 size={14} className="animate-spin" />}
              Nâng cấp ngay
            </button>

            {balance !== null && (
              <button
                onClick={() => handleUpgradeWithBalance("year")}
                disabled={loading !== null || balance < 599000}
                className="w-full py-2.5 rounded-xl border border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-750 font-bold text-[10px] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {loading === "year-balance" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Wallet size={12} />
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

      {/* Trust Badges / Info */}
      <div className="w-full max-w-3xl border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs text-center md:text-left z-10">
        <div>
          <p className="font-bold text-slate-500 mb-0.5">Thanh toán an toàn bảo mật qua cổng PayOS</p>
          <p>Mã hóa thông tin giao dịch, quét mã QR chuyển khoản tự động 24/7.</p>
        </div>
        <div className="flex gap-4 font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <Check size={14} />
            <span>Kích hoạt ngay lập tức</span>
          </div>
          <div className="flex items-center gap-1">
            <Check size={14} />
            <span>Không tự động gia hạn</span>
          </div>
        </div>
      </div>

      {paymentResult && (
        <PaymentResultModal
          status={paymentResult}
          onClose={() => setPaymentResult(null)}
        />
      )}
    </div>
  );
}
