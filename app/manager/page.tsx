"use client";
import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/useAuth";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerNavbar from "@/components/layout/ManagerNavbar";
import { BookOpen, FileText, Users2, Eye, EyeOff, Loader2 } from "lucide-react";

interface ManagerDashboard {
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  publishedCourses: number;
  unpublishedCourses: number;
  topCourses: { courseId: number; title: string; enrollmentCount: number; isPublished: boolean }[];
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

export default function ManagerDashboardPage() {
  // ✅ Guard quyền
  const roleChecked = useRequireRole("Manager");

  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Chỉ fetch khi đã xác nhận quyền
    if (!roleChecked) return;
    const token = localStorage.getItem("ol_access_token");
    fetch(`${BASE_URL}/api/manager/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roleChecked]); // ✅ deps đúng

  const stats = [
    { label: "Tổng khóa học", value: data?.totalCourses ?? 0, icon: BookOpen, color: "bg-blue-500" },
    { label: "Tổng bài học", value: data?.totalLessons ?? 0, icon: FileText, color: "bg-purple-500" },
    { label: "Enrollments", value: data?.totalEnrollments ?? 0, icon: Users2, color: "bg-green-500" },
    { label: "Đã published", value: data?.publishedCourses ?? 0, icon: Eye, color: "bg-orange-500" },
  ];

  // ✅ Không render nếu chưa xác nhận quyền
  if (!roleChecked) return null;

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <ManagerSidebar />
      <div className="flex-1 ml-[72px]">
        <ManagerNavbar title="Dashboard" />
        <main className="pt-20 px-6 pb-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className={`${s.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                      <s.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Courses */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Top khóa học theo enrollment</h3>
                <div className="space-y-3">
                  {data?.topCourses.map((c, i) => (
                    <div key={c.courseId} className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-400 w-5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-700">{c.title}</span>
                          {c.isPublished
                            ? <Eye size={12} className="text-green-500" />
                            : <EyeOff size={12} className="text-slate-400" />}
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min((c.enrollmentCount / (data.topCourses[0]?.enrollmentCount || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-600">{c.enrollmentCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}