"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, Loader2, ShoppingCart, Zap } from "lucide-react";
import { Course, getCourseColor, LEVEL_LABEL, formatCoursePrice, hasKnownPrice } from "@/lib/types";
import { coursesApi, startCheckout, isApiError } from "@/lib/api";
import { getUser } from "@/lib/auth";

export type PopupCourse = Pick<Course, "id" | "title" | "category" | "level" | "description" | "price">;

interface Props {
  course: PopupCourse;
  onClose: () => void;
}

export default function CoursePopup({ course, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Khóa trả phí mà user chưa có PRO → phải mua qua thanh toán (BE cũng trả 400 nếu gọi enroll)
  // Chưa biết giá → thử enroll, BE trả 400 nếu là khóa trả phí
  const [needsPurchase, setNeedsPurchase] = useState(() => hasKnownPrice(course.price) && course.price > 0 && !getUser()?.isPro);
  const priceLabel = formatCoursePrice(course.price);

  const gradient = getCourseColor(course);

  const handleEnroll = async () => {
    if (!getUser()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await coursesApi.enroll(course.id);
      router.push(`/course/${course.id}`);
    } catch (err: unknown) {
      if (isApiError(err, 409)) {
        // Đã ghi danh
        router.push(`/course/${course.id}`);
        return;
      }
      if (isApiError(err, 400)) {
        setNeedsPurchase(true);
        setError(err.serverMessage);
      } else {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
      }
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    setError("");
    try {
      await startCheckout({ type: "Course", courseId: course.id }, window.location.pathname);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tạo liên kết thanh toán.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-2xl font-bold">&lt;/&gt;</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">{course.title}</h2>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-slate-500">{LEVEL_LABEL[course.level] ?? course.level}</span>
            {priceLabel && <span className="text-sm font-bold text-blue-600">{priceLabel}</span>}
          </div>

          <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-3">
            {course.description}
          </p>

          <div className="flex items-center gap-1 text-xs text-slate-400 mb-5">
            <BookOpen size={13} />
            <span>{course.category}</span>
          </div>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          {needsPurchase ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBuy}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                Mua khóa học
              </button>
              <button
                onClick={() => router.push("/pricing")}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={14} /> Nâng cấp PRO để học mọi khóa
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Vào học ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
