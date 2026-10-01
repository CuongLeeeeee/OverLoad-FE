"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { coursesApi, adminApi, instructorApi } from "@/lib/api";
import {
  Course, CourseStatus, RevenueStats, UpsertCourseRequest, describeTransaction, TRANSACTION_STATUS_LABEL,
  COURSE_STATUS_LABEL, canEditCourse, formatCoursePrice
} from "@/lib/types";
import { getUser } from "@/lib/auth";
import {
  Plus, Edit, Trash2, BookOpen, AlertCircle, RefreshCw, Layers, Sparkles, DollarSign, TrendingUp, History, Send, XCircle
} from "lucide-react";

const STATUS_BADGE: Record<CourseStatus, string> = {
  Draft: "bg-slate-50 text-slate-500 border-slate-200",
  PendingReview: "bg-amber-50 text-amber-600 border-amber-200",
  Published: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_ORDER: CourseStatus[] = ["Draft", "PendingReview", "Published", "Rejected"];

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InstructorDashboardContent() {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category")?.toLowerCase() || "";

  // States
  const [courses, setCourses] = useState<Course[]>([]);
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "">("");
  const categoryCourses = useMemo(() => {
    if (!activeCategory) return courses;
    return courses.filter((c: Course) => c.category?.toLowerCase() === activeCategory);
  }, [courses, activeCategory]);
  const filteredCourses = useMemo(
    () => (statusFilter ? categoryCourses.filter((c) => c.status === statusFilter) : categoryCourses),
    [categoryCourses, statusFilter]
  );
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Stats states (GET /admin/revenue-stats chỉ dành cho Admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Modals state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [currentCourseEdit, setCurrentCourseEdit] = useState<Course | null>(null); // null means CREATE new
  // Giá do Admin đặt (tab Duyệt khóa học); trạng thái đổi qua workflow gửi duyệt
  const [courseFormData, setCourseFormData] = useState<{
    title: string;
    description: string;
    thumbnailUrl: string;
    category: string;
    level: "Beginner" | "Intermediate" | "Advanced";
  }>({
    title: "",
    description: "",
    thumbnailUrl: "",
    category: "Frontend",
    level: "Beginner",
  });

  // Instructor: mọi khóa của mình (mọi status). Admin: danh sách khóa chung.
  const fetchCourses = async () => {
    setLoadingCourses(true);
    setErrorMsg("");
    try {
      if (getUser()?.role === "Admin") {
        const res = await coursesApi.getAll({ pageSize: 100 });
        setCourses(res.items || []);
      } else {
        setCourses(await instructorApi.getCourses());
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải danh sách khóa học.");
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch stats
  const [mounted, setMounted] = useState(false);
  
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await adminApi.getRevenueStats();
      setStats(data);
    } catch (err: any) {
      console.error("Lỗi khi tải thống kê doanh thu:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCourses();
    const admin = getUser()?.role === "Admin";
    setIsAdmin(admin);
    if (admin) fetchStats();
    else setLoadingStats(false);
  }, []);

  // Set message helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Course CRUD Submit
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.title.trim()) return;

    setErrorMsg("");
    const payload: UpsertCourseRequest = {
      title: courseFormData.title.trim(),
      description: courseFormData.description || undefined,
      thumbnailUrl: courseFormData.thumbnailUrl || undefined,
      category: courseFormData.category || undefined,
      level: courseFormData.level,
    };
    try {
      if (currentCourseEdit) {
        await coursesApi.update(currentCourseEdit.id, payload);
        triggerSuccess(`Đã cập nhật khóa học "${courseFormData.title}"`);
      } else {
        await coursesApi.create(payload);
        triggerSuccess(`Đã tạo khóa học mới "${courseFormData.title}"`);
      }
      setCourseModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi lưu thông tin khóa học.");
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: number, title: string) => {
    if (!(await confirm({ title: `Xóa khóa học "${title}"?`, message: "Tất cả bài học bên trong cũng sẽ bị xóa. Không thể hoàn tác.", confirmLabel: "Xóa", danger: true }))) return;
    setErrorMsg("");
    try {
      await coursesApi.delete(id);
      triggerSuccess(`Đã xóa khóa học "${title}"`);
      fetchCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể xóa khóa học.");
    }
  };

  // Open Course Modal
  const openCourseModal = (course?: Course) => {
    if (course) {
      setCurrentCourseEdit(course);
      setCourseFormData({
        title: course.title,
        description: course.description || "",
        thumbnailUrl: course.thumbnailUrl || "",
        category: course.category || "Frontend",
        level: course.level || "Beginner",
      });
    } else {
      setCurrentCourseEdit(null);
      setCourseFormData({
        title: "",
        description: "",
        thumbnailUrl: "",
        category: "Frontend",
        level: "Beginner",
      });
    }
    setCourseModalOpen(true);
  };

  // Gửi khóa Draft/Rejected lên Admin duyệt
  const handleSubmitForReview = async (course: Course) => {
    if (!(await confirm({
      title: `Gửi duyệt "${course.title}"?`,
      message: "Khóa học sẽ chuyển sang trạng thái Chờ duyệt và không sửa được cho tới khi Admin xử lý.",
      confirmLabel: "Gửi duyệt",
    }))) return;
    setErrorMsg("");
    setSubmittingId(course.id);
    try {
      const updated = await instructorApi.submitCourse(course.id);
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, ...updated, status: updated?.status ?? "PendingReview" } : c)));
      triggerSuccess(`Đã gửi duyệt "${course.title}"`);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể gửi duyệt khóa học.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            Dashboard
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quản lý các khóa học lập trình trực quan và thiết kế các bài học scrollytelling.
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Duyệt sinh viên / duyệt khóa học đã chuyển sang mục Quản trị (chỉ Admin) ở thanh bên */}
          <button
            onClick={() => openCourseModal()}
            className="flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_16px_rgba(37,99,235,0.2)]"
          >
            <Plus size={14} /> Thêm khóa học
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {confirmDialog}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl fixed top-4 right-4 z-[60] shadow-lg max-w-sm text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats Section (Admin) */}
      {isAdmin && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Revenue Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-50 rounded-full blur-xl pointer-events-none" />
          <div className="z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Doanh Thu</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingStats ? "..." : `${stats?.totalRevenue.toLocaleString("vi-VN") ?? 0} VND`}
            </span>
            {stats && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                Khóa học {stats.courseRevenue.toLocaleString("vi-VN")}đ · PRO {stats.proRevenue.toLocaleString("vi-VN")}đ · Nạp ví {stats.depositRevenue.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign size={20} className="stroke-[2]" />
          </div>
        </div>

        {/* Courses Sold Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl pointer-events-none" />
          <div className="z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lượt Mua Khóa Học & PRO</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingStats ? "..." : (stats?.coursesSold ?? 0) + (stats?.proUpgradesSold ?? 0)}
            </span>
            {stats && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                {stats.coursesSold} khóa học · {stats.proUpgradesSold} gói PRO · Số dư ví tồn: {stats.outstandingWalletBalance.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp size={20} className="stroke-[2]" />
          </div>
        </div>
      </div>
      )}

      {/* Courses List Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={13} className="text-slate-400" /> Các khóa học của bạn ({filteredCourses.length})
          </h2>
          <button onClick={fetchCourses} className="text-slate-400 hover:text-slate-655 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Lọc theo trạng thái duyệt */}
        <div className="flex flex-wrap gap-1.5">
          {([""] as const).concat(STATUS_ORDER as any).map((s: CourseStatus | "") => {
            const count = s ? categoryCourses.filter((c) => c.status === s).length : categoryCourses.length;
            const active = statusFilter === s;
            return (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {s ? COURSE_STATUS_LABEL[s] : "Tất cả"} ({count})
              </button>
            );
          })}
        </div>

        {loadingCourses ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
            Đang tải khóa học...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs bg-white shadow-sm flex flex-col items-center justify-center gap-2">
            <BookOpen size={20} className="text-slate-300" />
            <p className="font-bold text-slate-700">Chưa có khóa học nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCourses.map((course) => {
              // Dynamic level badges
              let levelBadgeClass = "bg-blue-50 text-blue-600 border border-blue-150";
              if (course.level === "Beginner") {
                levelBadgeClass = "bg-emerald-50 text-emerald-600 border border-emerald-150";
              } else if (course.level === "Advanced") {
                levelBadgeClass = "bg-rose-50 text-rose-600 border border-rose-150";
              }

              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/instructor/courses/${course.id}/lessons`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(37,99,235,0.02)] transition-all duration-200 cursor-pointer flex items-center gap-4 group"
                >
                  {/* Small icon/thumbnail on the left */}
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 shrink-0 border border-slate-100 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src = "https://placehold.co/100/e2e8f0/64748b?text=Course";
                        }}
                      />
                    ) : (
                      <BookOpen size={18} className="stroke-[1.5]" />
                    )}
                  </div>

                  {/* Info in the middle */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-sm">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                        {course.category}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${levelBadgeClass}`}>
                        {course.level}
                      </span>
                      <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                        {formatCoursePrice(course.price ?? 0)} · {course.totalLessons} bài
                      </span>
                      {course.status && (
                        <span className={`text-[8px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${STATUS_BADGE[course.status]}`}>
                          {COURSE_STATUS_LABEL[course.status]}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {course.description || "Không có mô tả chi tiết."}
                    </p>
                    {course.status === "Rejected" && course.rejectionReason && (
                      <p className="mt-1.5 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 flex items-start gap-1">
                        <XCircle size={11} className="shrink-0 mt-px" />
                        <span><strong>Lý do từ chối:</strong> {course.rejectionReason}</span>
                      </p>
                    )}
                  </div>

                  {/* Action buttons on the right */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canEditCourse(course) && (
                      <button
                        onClick={() => handleSubmitForReview(course)}
                        disabled={submittingId === course.id}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                        title="Gửi khóa học lên Admin duyệt"
                      >
                        <Send size={10} /> Gửi duyệt
                      </button>
                    )}
                    {canEditCourse(course) && (
                      <button
                        onClick={() => openCourseModal(course)}
                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 transition-all active:scale-90"
                        title="Chỉnh sửa khóa học"
                      >
                        <Edit size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-slate-100 transition-all active:scale-90"
                      title="Xóa khóa học"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transactions Section (Admin) */}
      {isAdmin && (
      <div className="flex flex-col gap-4 mt-8">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <History size={13} className="text-slate-400" /> Lịch sử giao dịch gần đây
        </h2>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {loadingStats ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
              Đang tải lịch sử giao dịch...
            </div>
          ) : !stats || stats.recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white">
              <p className="font-bold text-slate-700">Chưa phát sinh giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                    <th className="p-4">Mã đơn</th>
                    <th className="p-4">Học viên</th>
                    <th className="p-4">Khóa học / Dịch vụ</th>
                    <th className="p-4">Số tiền</th>
                    <th className="p-4">Thời gian</th>
                    <th className="p-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {stats.recentTransactions.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[10px] text-slate-400">{tx.orderCode}</td>
                      <td className="p-4 font-semibold text-slate-800">{tx.userFullName || "Học viên"}</td>
                      <td className="p-4 font-medium text-slate-700">
                        {describeTransaction(tx)}
                        <span className="ml-1 text-[9px] text-slate-400">({tx.method === "Wallet" ? "Ví" : "PayOS"})</span>
                      </td>
                      <td className="p-4 font-bold text-blue-600">{(tx.amount).toLocaleString("vi-VN")}đ</td>
                      <td className="p-4 text-slate-400">
                        {new Date(tx.paidAt ?? tx.createdAt).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          tx.status === "Success"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-250"
                            : tx.status === "Pending"
                            ? "bg-amber-50 text-amber-600 border-amber-250"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {TRANSACTION_STATUS_LABEL[tx.status] ?? tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Course Modal */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-[scaleUp_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {currentCourseEdit ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
            </h3>
            
            <form onSubmit={handleCourseSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên khóa học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: HTML/CSS Cơ bản"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả ngắn</label>
                <textarea
                  placeholder="Giới thiệu sơ qua về nội dung khóa học..."
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all h-24 resize-none"
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Danh mục</label>
                  <select
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={courseFormData.category}
                    onChange={(e) => setCourseFormData({...courseFormData, category: e.target.value})}
                  >
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Database">Database</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Trình độ</label>
                  <select
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={courseFormData.level}
                    onChange={(e) => setCourseFormData({...courseFormData, level: e.target.value as "Beginner" | "Intermediate" | "Advanced"})}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Giá do Admin đặt ở mục "Duyệt khóa học" (PUT /admin/courses/{id}/price) */}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Ảnh Thumbnail (URL)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={courseFormData.thumbnailUrl}
                  onChange={(e) => setCourseFormData({...courseFormData, thumbnailUrl: e.target.value})}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-1">
                Khóa học mới ở trạng thái Nháp. Bấm "Gửi duyệt" khi đã sẵn sàng; Admin sẽ duyệt và đặt giá.
              </p>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function InstructorDashboard() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
        Đang tải trang quản trị...
      </div>
    }>
      <InstructorDashboardContent />
    </Suspense>
  );
}
