"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import CourseCard from "@/components/course/CourseCard";
import { coursesApi, enrollmentsApi, usersApi } from "@/lib/api";
import { Course, EnrollmentDetail, UserCourse } from "@/lib/types";
import { getUser, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MyCoursesPage() {
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    usersApi
      .getMyCoursesWithProgress()
      .then((data) => {
        setUserCourses(data);
      })
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

          {!loading && !error && userCourses.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Bạn chưa đăng ký khóa học nào.
            </div>
          )}

          {!loading && !error && userCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userCourses.map((userCourse) => (
                <div key={userCourse.courseId} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CourseCard course={userCourse} showProgress={true} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
