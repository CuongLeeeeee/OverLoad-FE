"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { coursesApi, lessonsApi, meApi, startCheckout, isApiError } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import { CourseDetail, CourseLessonItem, Lesson } from "@/lib/types";
import LessonSidebar from "@/components/course/LessonSidebar";
import LessonContent from "@/components/course/LessonContent";
import { ChevronLeft, ChevronRight, Menu, MoreVertical, Loader2, Lock, LogIn, Zap, ShoppingCart } from "lucide-react";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<CourseLessonItem[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [lessonDetail, setLessonDetail] = useState<Lesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonAccessError, setLessonAccessError] = useState<{ status: number; message: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"desc" | "qa" | "author">("desc");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [hasPaidAccess, setHasPaidAccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      coursesApi.getById(id),
      coursesApi.getLessons(id),
    ])
      .then(([c, ls]) => {
        setCourse(c);
        setLessons(ls);
        if (ls.length > 0) {
          // Mở bài đang học dở: bài đầu tiên chưa hoàn thành và không bị khóa
          const resume = ls.find((l) => !l.completed && !l.isLocked);
          setActiveLessonId((resume ?? ls[0]).id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Có PRO hoặc đã ghi danh (GET /me/courses/{id}/progress trả 404 nếu chưa)
  useEffect(() => {
    if (!id || !isLoggedIn()) return;
    if (getUser()?.isPro) {
      setHasPaidAccess(true);
      return;
    }
    meApi.getCourseProgress(id)
      .then(() => setHasPaidAccess(true))
      .catch(() => setHasPaidAccess(false));
  }, [id]);

  // Danh sách bài không có content → tải chi tiết bài đang chọn
  useEffect(() => {
    if (!activeLessonId) return;
    let cancelled = false;
    setLessonLoading(true);
    setLessonAccessError(null);
    lessonsApi.getById(activeLessonId)
      .then((l) => { if (!cancelled) setLessonDetail(l); })
      .catch((err) => {
        if (cancelled) return;
        setLessonDetail(null);
        setLessonAccessError({ status: isApiError(err) ? err.status : 0, message: err.message });
      })
      .finally(() => { if (!cancelled) setLessonLoading(false); });
    return () => { cancelled = true; };
  }, [activeLessonId]);

  // Sau khi hoàn thành bài → lấy lại trạng thái completed / isLocked
  const refreshLessons = useCallback(() => {
    coursesApi.getLessons(id).then(setLessons).catch(() => { /* giữ danh sách cũ */ });
  }, [id]);

  const handleLessonSelect = (lessonId: number) => {
    setActiveLessonId(lessonId);
  };

  const handleBuyCourse = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      await startCheckout({ type: "Course", courseId: id }, `/course/${id}`);
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Không thể tạo thanh toán.");
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{error || "Không tìm thấy khóa học"}</p>
          <Link href="/" className="text-blue-600 hover:underline">← Quay lại trang chủ</Link>
        </div>
      </div>
    );
  }

  const currentIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = currentIndex >= 0 ? lessons[currentIndex] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  // Cùng quy tắc với LessonSidebar: bài trả phí chưa có quyền vẫn cho mở để hiện CTA
  const nextLessonBlocked = !!nextLesson && nextLesson.isLocked && (nextLesson.isFree || hasPaidAccess);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Lesson Sidebar */}
      <div className={`${sidebarOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0"} transition-all duration-300 overflow-hidden border-r border-slate-200`}>
        {sidebarOpen && (
          <LessonSidebar
            course={course}
            lessons={lessons}
            activeLessonId={activeLessonId}
            onLessonSelect={handleLessonSelect}
            onClose={() => setSidebarOpen(false)}
            hasPaidAccess={hasPaidAccess}
          />
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-12 bg-slate-900 flex items-center px-4 gap-3 shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors">
              <Menu size={18} />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
            <Link href="/" className="hover:text-white transition-colors shrink-0">Trang chủ</Link>
            <span>/</span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
              {course.title}
            </span>
            {activeLesson && (
              <>
                <span>/</span>
                <span className="text-white truncate">{activeLesson.title}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={() => prevLesson && handleLessonSelect(prevLesson.id)}
              disabled={!prevLesson}
              className="text-white/60 hover:text-white transition-colors text-xs flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              onClick={() => nextLesson && handleLessonSelect(nextLesson.id)}
              disabled={!nextLesson || nextLessonBlocked}
              title={nextLessonBlocked ? "Hoàn thành bài hiện tại để mở bài tiếp theo" : undefined}
              className="px-4 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-30"
            >
              Tiếp theo <ChevronRight size={14} />
            </button>
            <button className="text-white/60 hover:text-white transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {lessonLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : lessonAccessError ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="max-w-sm w-full text-center bg-white border border-slate-100 rounded-3xl shadow-lg p-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                  <Lock size={24} />
                </div>
                {lessonAccessError.status === 401 ? (
                  <>
                    <h2 className="text-base font-bold text-slate-800 mb-2">Đăng nhập để học bài này</h2>
                    <p className="text-xs text-slate-500 mb-6">Bài học này dành cho học viên đã đăng nhập.</p>
                    <button
                      onClick={() => router.push("/login")}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <LogIn size={14} /> Đăng nhập
                    </button>
                  </>
                ) : lessonAccessError.status === 403 ? (
                  <>
                    <h2 className="text-base font-bold text-slate-800 mb-2">Bài học trả phí</h2>
                    <p className="text-xs text-slate-500 mb-6">
                      Mua khóa học hoặc nâng cấp PRO để mở khóa toàn bộ bài học.
                    </p>
                    {checkoutError && <p className="text-xs text-red-500 mb-3">{checkoutError}</p>}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleBuyCourse}
                        disabled={checkoutLoading}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {checkoutLoading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                        Mua khóa học
                      </button>
                      <button
                        onClick={() => router.push("/pricing")}
                        className="w-full py-2.5 rounded-xl border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Zap size={14} /> Nâng cấp PRO
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-bold text-slate-800 mb-2">Không thể tải bài học</h2>
                    <p className="text-xs text-slate-500">{lessonAccessError.message}</p>
                  </>
                )}
              </div>
            </div>
          ) : lessonDetail ? (
            <LessonContent
              lesson={lessonDetail}
              course={course}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCompleted={refreshLessons}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Chọn bài học để bắt đầu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
