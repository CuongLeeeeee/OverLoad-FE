"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Course, COURSE_STATUS_LABEL, LEVEL_LABEL, formatCoursePrice } from "@/lib/types";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AlertCircle, CheckCircle2, ClipboardCheck, Eye, Loader2, RefreshCw, Save, XCircle } from "lucide-react";

export default function CourseReviewsPage() {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  // Giá đang nhập theo từng khóa (chuỗi để cho phép ô trống)
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [rejecting, setRejecting] = useState<Course | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const list = await adminApi.getPendingCourses();
      setCourses(list);
      setPriceDrafts(Object.fromEntries(list.map((c) => [c.id, String(c.price ?? 0)])));
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải hàng đợi duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Chỉ Admin (API cũng trả 403 nếu sai quyền)
    if (getUser()?.role !== "Admin") {
      router.replace("/instructor/dashboard");
      return;
    }
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFromQueue = (id: number) => setCourses((prev) => prev.filter((c) => c.id !== id));

  const handleSavePrice = async (course: Course) => {
    const price = Number(priceDrafts[course.id]);
    if (!Number.isInteger(price) || price < 0) {
      setErrorMsg("Giá phải là số nguyên VND, không âm.");
      return;
    }
    setBusyId(course.id);
    setErrorMsg("");
    try {
      const updated = await adminApi.setCoursePrice(course.id, price);
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, ...updated, price: updated?.price ?? price } : c)));
      triggerSuccess(`Đã đặt giá "${course.title}": ${formatCoursePrice(price)}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể đặt giá.");
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (course: Course) => {
    if (!(await confirm({
      title: `Duyệt "${course.title}"?`,
      message: `Khóa học sẽ được xuất bản với giá ${formatCoursePrice(course.price ?? 0)}.`,
      confirmLabel: "Duyệt",
    }))) return;
    setBusyId(course.id);
    setErrorMsg("");
    try {
      await adminApi.approveCourse(course.id);
      removeFromQueue(course.id);
      triggerSuccess(`Đã duyệt và xuất bản "${course.title}"`);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể duyệt khóa học.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    const course = rejecting;
    setBusyId(course.id);
    setErrorMsg("");
    try {
      await adminApi.rejectCourse(course.id, reason);
      removeFromQueue(course.id);
      setRejecting(null);
      setRejectReason("");
      triggerSuccess(`Đã từ chối "${course.title}"`);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể từ chối khóa học.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {confirmDialog}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl fixed top-4 right-4 z-[60] shadow-lg max-w-sm text-xs font-semibold">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={22} className="text-blue-600" />
            Duyệt khóa học
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Xem nội dung, đặt giá, rồi duyệt để xuất bản hoặc từ chối kèm lý do cho giảng viên.
          </p>
        </div>
        <button onClick={fetchPending} className="text-slate-400 hover:text-slate-700 transition-colors" title="Tải lại">
          <RefreshCw size={14} />
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
          Đang tải hàng đợi duyệt...
        </div>
      ) : courses.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs bg-white shadow-sm">
          <p className="font-bold text-slate-700">Không có khóa học nào đang chờ duyệt</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => {
            const busy = busyId === course.id;
            const pending = course.status === "PendingReview";
            const priceChanged = priceDrafts[course.id] !== String(course.price ?? 0);
            return (
              <div key={course.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{course.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] text-slate-500">
                    <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">{course.category}</span>
                    <span>{LEVEL_LABEL[course.level] ?? course.level}</span>
                    <span>· {course.totalLessons} bài · {course.totalDurationMinutes} phút</span>
                    <span>· Giảng viên #{course.instructorId}</span>
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase">
                      {COURSE_STATUS_LABEL[course.status] ?? course.status}
                    </span>
                  </div>
                  {course.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{course.description}</p>}
                </div>

                {/* Giá */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={priceDrafts[course.id] ?? ""}
                    onChange={(e) => setPriceDrafts((p) => ({ ...p, [course.id]: e.target.value }))}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    aria-label="Giá (VND)"
                    disabled={busy}
                  />
                  <span className="text-[10px] text-slate-400">VND</span>
                  <button
                    onClick={() => handleSavePrice(course)}
                    disabled={busy || !priceChanged}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40"
                    title="Lưu giá"
                  >
                    <Save size={12} />
                  </button>
                </div>

                {/* Hành động */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/instructor/courses/${course.id}/lessons`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300"
                    title="Xem nội dung bài học"
                  >
                    <Eye size={12} />
                  </Link>
                  {pending && (
                    <>
                      <button
                        onClick={() => { setRejecting(course); setRejectReason(""); }}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle size={12} /> Từ chối
                      </button>
                      <button
                        onClick={() => handleApprove(course)}
                        disabled={busy || priceChanged}
                        title={priceChanged ? "Lưu giá trước khi duyệt" : undefined}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Duyệt
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog nhập lý do từ chối */}
      {rejecting && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRejecting(null)}>
          <div role="dialog" aria-modal="true" className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Từ chối "{rejecting.title}"</h3>
            <p className="text-xs text-slate-500 mb-3">Lý do sẽ được hiển thị cho giảng viên để chỉnh sửa và gửi lại.</p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Vd: Bài 3 thiếu ví dụ minh họa, mô tả khóa học quá ngắn..."
              className="w-full h-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-400 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejecting(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold">
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || busyId === rejecting.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1"
              >
                {busyId === rejecting.id && <Loader2 size={12} className="animate-spin" />}
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
