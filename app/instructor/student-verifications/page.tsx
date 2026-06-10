"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usersApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { 
  Shield, AlertCircle, Loader2, ArrowLeft, Check, X, Image as ImageIcon, User
} from "lucide-react";

interface PendingVerification {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardPath: string;
  updatedAt: string;
}

export default function StudentVerificationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pendingList, setPendingList] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [zoomedItem, setZoomedItem] = useState<PendingVerification | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await usersApi.getPendingStudentVerifications();
      setPendingList(res || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải danh sách yêu cầu xác minh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const user = getUser();
    if (!user || (user.role !== "Admin" && user.role !== "Instructor")) {
      router.push("/");
      return;
    }
    fetchPending();
  }, [router]);

  const handleVerify = async (userId: number, action: "approve" | "reject") => {
    setProcessingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await usersApi.verifyStudent(userId, action);
      if (res.success) {
        setSuccessMsg(res.message);
        setPendingList(prev => prev.filter(item => item.id !== userId));
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(res.message || "Xử lý thất bại.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi cập nhật trạng thái.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/instructor/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold mb-3 group inline-flex"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Quay lại Dashboard
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" />
            Duyệt Xác minh Học sinh / Sinh viên
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Xem xét thông tin và bằng chứng hình ảnh thẻ học sinh, sinh viên để cấp quyền ưu đãi giảm giá 30%.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50/70 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50/70 border border-emerald-200 text-emerald-600 rounded-xl mb-6 text-xs font-semibold">
          <Check size={16} className="shrink-0 mt-0.5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
          Đang tải danh sách yêu cầu...
        </div>
      ) : pendingList.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-xs bg-white shadow-sm flex flex-col items-center justify-center gap-2.5">
          <Shield size={24} className="text-slate-300" />
          <p className="font-bold text-slate-700">Chưa có yêu cầu nào cần duyệt</p>
          <p className="text-[10px] text-slate-400">Các yêu cầu xác minh sinh viên mới của học viên sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fcfdfe] border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Học viên</th>
                  <th className="p-4">Ảnh bằng chứng</th>
                  <th className="p-4">Thời gian gửi</th>
                  <th className="p-4 text-center w-48">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {pendingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{item.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.studentCardPath ? (
                        <button
                          onClick={() => setZoomedItem(item)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg font-bold flex items-center gap-1.5 active:scale-95 transition-all text-[10px] whitespace-nowrap"
                        >
                          <ImageIcon size={12} />
                          Xem bằng chứng
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[10px] whitespace-nowrap">Không có ảnh</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {new Date(item.updatedAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2 flex-nowrap">
                        <button
                          onClick={() => handleVerify(item.id, "approve")}
                          disabled={processingId !== null}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {processingId === item.id ? (
                            <Loader2 size={12} className="animate-spin text-emerald-600" />
                          ) : (
                            <Check size={12} className="stroke-[2.5]" />
                          )}
                          Đồng ý
                        </button>
                        <button
                          onClick={() => handleVerify(item.id, "reject")}
                          disabled={processingId !== null}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {processingId === item.id ? (
                            <Loader2 size={12} className="animate-spin text-red-655" />
                          ) : (
                            <X size={12} className="stroke-[2.5]" />
                          )}
                          Từ Chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedItem && (
        <div 
          onClick={() => setZoomedItem(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
        >
          <div 
            className="relative flex flex-col md:flex-row max-w-5xl w-full max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border bg-white select-none cursor-default animate-[scaleIn_0.15s_ease-out]" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setZoomedItem(null)}
              className="absolute top-3 right-3 p-1.5 bg-white/85 hover:bg-white border rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow z-10"
            >
              <X size={16} />
            </button>
            
            {/* Image container */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center min-h-[320px] md:max-h-[85vh]">
              <img src={apiUrl + zoomedItem.studentCardPath} alt="Zoomed Proof" className="max-w-full max-h-[50vh] md:max-h-[85vh] object-contain" />
            </div>

            {/* Sidebar User Details */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-between bg-slate-50">
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Thông tin học viên
                </h3>
                
                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                    {zoomedItem.avatarUrl ? (
                      <img src={zoomedItem.avatarUrl} alt={zoomedItem.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate leading-tight">{zoomedItem.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{zoomedItem.email}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-400">ID học viên</span>
                    <span className="font-bold text-slate-700">{zoomedItem.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/40">
                    <span className="text-slate-400">Thời gian gửi</span>
                    <span className="font-bold text-slate-700">
                      {new Date(zoomedItem.updatedAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar Action Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-200/60 flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleVerify(zoomedItem.id, "approve");
                    setZoomedItem(null);
                  }}
                  disabled={processingId !== null}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs disabled:opacity-50 shadow-sm"
                >
                  <Check size={14} className="stroke-[2.5]" />
                  Đồng ý phê duyệt
                </button>
                <button
                  onClick={() => {
                    handleVerify(zoomedItem.id, "reject");
                    setZoomedItem(null);
                  }}
                  disabled={processingId !== null}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-150 border border-red-200 text-red-600 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs disabled:opacity-50"
                >
                  <X size={14} className="stroke-[2.5]" />
                  Từ chối xác minh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
