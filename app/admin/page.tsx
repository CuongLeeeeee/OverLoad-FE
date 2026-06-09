"use client";
import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/useAuth";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavbar from "@/components/layout/AdminNavbar";
import { Users, BookOpen, TrendingUp, DollarSign, Loader2 } from "lucide-react";

interface UserItem {
  id: number;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface DashboardData {
  totalUsers: number;
  totalCourses: number;
  totalRevenue: number;
  coursesSold: number;
  usersByRole: Record<string, number>;
  recentUsers: UserItem[];
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

async function safeFetch<T>(url: string, token: string | null): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function AdminDashboard() {
  useRequireRole("Admin");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ol_access_token");

    Promise.allSettled([
      safeFetch<Record<string, unknown>>(`${BASE_URL}/api/admin/users?pageSize=100`, token),
      safeFetch<Record<string, unknown>>(`${BASE_URL}/api/courses?pageSize=1`, token),
      safeFetch<Record<string, unknown>>(`${BASE_URL}/api/payment/stats`, token),
    ]).then(([usersRes, coursesRes, statsRes]) => {
      // ── Users ──────────────────────────────────────────────
      const usersPayload = usersRes.status === "fulfilled" ? usersRes.value : null;
      const users: UserItem[] = (usersPayload?.["data"] as UserItem[]) ?? [];
      const totalUsers: number =
        ((usersPayload?.["pagination"] as Record<string, number>)?.["totalCount"]) ??
        users.length;

      const roleMap: Record<string, number> = {};
      users.forEach((u) => { roleMap[u.role] = (roleMap[u.role] ?? 0) + 1; });

      const recentUsers = [...users]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);

      // ── Courses ────────────────────────────────────────────
      const coursesPayload = coursesRes.status === "fulfilled" ? coursesRes.value : null;
      const totalCourses: number =
        (coursesPayload?.["totalCount"] as number) ??
        ((coursesPayload?.["data"] as Record<string, number>)?.["totalCount"]) ??
        0;

      // ── Payment stats ──────────────────────────────────────
      const statsPayload = statsRes.status === "fulfilled" ? statsRes.value : null;
      const statsData = (statsPayload?.["data"] ?? statsPayload) as Record<string, number> | null;

      setData({
        totalUsers,
        totalCourses,
        totalRevenue: statsData?.["totalRevenue"] ?? 0,
        coursesSold: statsData?.["coursesSold"] ?? 0,
        usersByRole: roleMap,
        recentUsers,
      });
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Tổng Users",  value: data?.totalUsers ?? 0,  icon: Users,       color: "bg-blue-500" },
    { label: "Tổng Courses", value: data?.totalCourses ?? 0, icon: BookOpen,   color: "bg-purple-500" },
    { label: "Courses Sold", value: data?.coursesSold ?? 0,  icon: TrendingUp, color: "bg-green-500" },
    {
      label: "Doanh thu",
      value: (data?.totalRevenue ?? 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" }),
      icon: DollarSign,
      color: "bg-orange-500",
      isString: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <AdminSidebar />
      <div className="flex-1 ml-[72px]">
        <AdminNavbar title="Dashboard" />
        <main className="pt-20 px-6 pb-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className={`${s.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                      <s.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800">
                        {s.isString ? s.value : (s.value as number).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Users by Role */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Phân bổ theo Role</h3>
                  <div className="space-y-3">
                    {Object.entries(data?.usersByRole ?? {}).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{role}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${((count / (data?.totalUsers || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">User mới nhất</h3>
                  <div className="space-y-3">
                    {data?.recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                          {u.fullName.split(" ").pop()?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-700 truncate">{u.fullName}</div>
                          <div className="text-xs text-slate-400 truncate">{u.email}</div>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}