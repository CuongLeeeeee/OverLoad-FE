"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { coursesApi, lessonsApi, enrollmentsApi } from "@/lib/api";
import { Course, Lesson, CourseProgress, LessonWithProgress } from "@/lib/types";
import LessonSidebar from "@/components/course/LessonSidebar";
import LessonContent from "@/components/course/LessonContent";
import { ChevronLeft, ChevronRight, Menu, MoreVertical, Loader2 } from "lucide-react";
import { isLoggedIn, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function CoursePage() {
  const params = useParams();
  const id = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<(Lesson | LessonWithProgress)[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | LessonWithProgress | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"desc" | "qa" | "author">("desc");
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const router = useRouter();
  const [isEnrolled, setIsEnrolled] = useState(false);


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
          setActiveLessonId(ls[0].id);
          setActiveLesson(ls[0]);
        }

        // Check enrollment nếu đã login
        const user = getUser();
        if (user) {
          enrollmentsApi.getByUser(user.id)
            .then((enrollments) => {
              const enrolled = enrollments.some((e) => e.courseId === id);
              setIsEnrolled(enrolled);
            })
            .catch(() => setIsEnrolled(false));

          // Load course progress
          loadCourseProgress(id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Load course progress
  const loadCourseProgress = async (courseId: number) => {
    try {
      setProgressLoading(true);
      const progress = await coursesApi.getCourseProgress(courseId);
      console.log("loadCourseProgress success:", progress);
      setCourseProgress(progress);
    } catch (err) {
      console.error("Failed to load course progress:", err);
      setCourseProgress(null);
    } finally {
      setProgressLoading(false);
    }
  };

  // Callback when lesson is completed
  const handleLessonCompleted = (lessonId: number) => {
    // Reload course progress
    if (course) {
      loadCourseProgress(course.id);
    }
  };

  // Load lesson detail when switching
  const handleLessonSelect = (lessonId: number) => {
    if (!isEnrolled) {
      // Hiện thông báo hoặc scroll đến nút đăng ký
      return;
    }
    setActiveLessonId(lessonId);
    const found = lessons.find((l) => l.id === lessonId) ?? null;
    setActiveLesson(found);
    
    // Load lesson with full content from API
    if (found) {
      lessonsApi.getById(lessonId)
        .then((fullLesson) => {
          setActiveLesson(fullLesson);
        })
        .catch((err) => {
          console.error("Failed to load lesson content:", err);
          // Keep the lesson from the list even if content load fails
        });
    }
  };
  const handleEnroll = async () => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    const user = getUser()!;
    try {
      await enrollmentsApi.enroll(user.id, id);
      setIsEnrolled(true);
    } catch {
      // đã enroll rồi thì cũng set true
      setIsEnrolled(true);
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
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

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
            courseProgress={courseProgress}
            progressLoading={progressLoading}
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
              disabled={!nextLesson}
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
          {activeLesson && isEnrolled ? (
            <LessonContent
              lesson={activeLesson as Lesson}
              course={course}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLessonCompleted={handleLessonCompleted}
              initialCompleted={"completed" in activeLesson ? (activeLesson as any).completed : false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">{course.title}</h2>
                <p className="text-slate-500 text-sm mb-6">Đăng ký khóa học để bắt đầu học</p>
                <button
                  onClick={handleEnroll}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {isLoggedIn() ? "Đăng ký học miễn phí" : "Đăng nhập để học"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
