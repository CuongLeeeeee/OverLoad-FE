"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import CourseCard from "@/components/course/CourseCard";
import { meApi } from "@/lib/api";
import { MyCourse } from "@/lib/types";
import { isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PaymentResultModal, { readPaymentResultParam, PaymentResultStatus } from "@/components/payment/PaymentResultModal";

export default function MyCoursesPage() {
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentResult, setPaymentResult] = useState<PaymentResultStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Chỉ set khi có kết quả: StrictMode (dev) chạy effect 2 lần, lần 2 URL đã bị xóa query
    const payResult = readPaymentResultParam();
    if (payResult) setPaymentResult(payResult);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    meApi
      .getCourses()
      .then(setMyCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <Sidebar />
      <div className="flex-1 ml-[72px]">
        <Navbar />
        <main className="pt-14 px-6 pb-10">
          <section className="mt-5 mb-7">
            <div className="flex flex-col gap-3">
              <div className="text-sm text-slate-500">Danh sách khóa học đã đăng ký</div>
              <h1 className="text-3xl font-bold text-slate-900">Khóa của tôi</h1>
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center text-red-500 text-sm">
              Không thể tải khóa học: {error}
            </div>
          )}

          {!loading && !error && myCourses.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Bạn chưa đăng ký khóa học nào.
            </div>
          )}

          {!loading && !error && myCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map((item) => (
                <div key={item.courseId} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CourseCard
                    course={{
                      id: item.courseId,
                      title: item.title,
                      category: item.category,
                      level: item.level,
                      description: null,
                      price: item.price,
                    }}
                  />
                  <div className="p-4 bg-slate-50">
                    <div className="text-sm text-slate-600 mb-1">Khóa: {item.title}</div>
                    <div className="text-sm text-slate-600">
                      Tiến độ: {Math.round(item.progressPercentage ?? 0)}% ({item.completedLessons}/{item.totalLessons} bài)
                    </div>
                    <div className="text-sm text-slate-600">Đăng ký: {new Date(item.enrolledAt).toLocaleDateString("vi-VN")}</div>
                    <div className="text-sm text-slate-600">
                      {item.isCompleted && item.completedAt
                        ? `Hoàn thành: ${new Date(item.completedAt).toLocaleDateString("vi-VN")}`
                        : "Chưa hoàn thành"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
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
