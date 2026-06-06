"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, clearAuth } from "@/lib/auth";
import { User } from "@/lib/types";
import { paymentApi, enrollmentsApi } from "@/lib/api";
import {
  LogOut, Mail, Shield, BookOpen, Award, Clock, Wallet, ArrowLeft, Loader2
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [coursesCount, setCoursesCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);

    // Lấy số dư ví học viên
    setLoadingBalance(true);
    paymentApi.getBalance()
      .then(res => setBalance(res.balance))
      .catch(err => console.error("Lỗi lấy số dư:", err))
      .finally(() => setLoadingBalance(false));

    // Lấy số lượng khóa học đã đăng ký thực tế
    enrollmentsApi.getByUserDetails(u.id)
      .then(res => {
        const actualEnrollments = res.filter(e => e.courseSlug !== "pro-upgrade-month" && e.courseSlug !== "pro-upgrade-year" && e.courseSlug !== "system-deposit-balance");
        setCoursesCount(actualEnrollments.length);
        
        const hasPro = res.some(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year");
        setIsPro(hasPro);
      })
      .catch(err => console.error("Lỗi lấy số lượng khóa học:", err));
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#eef2fb] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";

  const roleLabel: Record<string, string> = {
    Student: "Học viên",
    Instructor: "Giảng viên",
    Admin: "Quản trị viên",
  };

  return (
    <div className="ml-[72px] pt-14 min-h-screen bg-[#eef2fb] flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-8 animate-[fadeIn_0.3s_ease-out] select-none">
        
        {/* Back Button */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold mb-4 group inline-flex"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Quay lại Dashboard
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-6 relative">
          {/* Banner Gradient */}
          <div className="h-28 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar & Logout button row */}
            <div className="flex justify-between items-end -mt-10 mb-5">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-extrabold select-none">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition-all active:scale-95"
              >
                <LogOut size={13} />
                Đăng xuất
              </button>
            </div>

            {/* Profile Info */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{user.fullName}</h1>
              <span className="text-xs text-slate-400 font-medium block mt-1">{user.email}</span>

              {/* Badges */}
              <div className="flex gap-1.5 mt-3">
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {roleLabel[user.role] ?? user.role}
                </span>
                <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isPro 
                    ? "bg-purple-50 text-purple-600 border-purple-150" 
                    : "bg-indigo-50 text-indigo-650 border border-indigo-150"
                }`}>
                  {isPro ? "Gói PRO" : "Gói Free"}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 mb-6" />

            {/* Balance Widget */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-50 rounded-full blur-lg pointer-events-none" />
              <div className="z-10">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Số dư tài khoản</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">
                  {loadingBalance ? "..." : `${(balance ?? 0).toLocaleString("vi-VN")} VND`}
                </span>
              </div>
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Wallet size={18} className="stroke-[1.5]" />
              </div>
            </div>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <BookOpen size={16} className="text-orange-400" />
            </div>
            <div className="text-lg font-bold text-slate-800 leading-none">{coursesCount}</div>
            <div className="text-[10px] text-slate-450 mt-1 font-semibold">Khóa học</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Award size={16} className="text-green-400" />
            </div>
            <div className="text-lg font-bold text-slate-800 leading-none">0</div>
            <div className="text-[10px] text-slate-450 mt-1 font-semibold">Chứng chỉ</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock size={16} className="text-blue-400" />
            </div>
            <div className="text-lg font-bold text-slate-800 leading-none">0h</div>
            <div className="text-[10px] text-slate-450 mt-1 font-semibold">Học tập</div>
          </div>
        </div>

      </div>
    </div>
  );
}