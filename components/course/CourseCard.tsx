"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Code2, Database, Server, type LucideIcon } from "lucide-react";
import { Course, getCourseColor, LEVEL_LABEL, formatCoursePrice, hasKnownPrice } from "@/lib/types";
import { meApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import CoursePopup, { PopupCourse } from "./CoursePopup";

export type CardCourse = PopupCourse & Pick<Course, "level"> & Partial<Pick<Course, "thumbnailUrl">>;

// Màu + icon theo danh mục để nhìn qua là biết khóa thuộc nhóm nào
const CATEGORY_THEMES: Record<string, { gradient: string; icon: LucideIcon; label: string }> = {
  frontend: { gradient: "from-indigo-500 via-violet-500 to-fuchsia-500", icon: Code2, label: "Frontend" },
  backend: { gradient: "from-emerald-500 via-teal-500 to-cyan-600", icon: Server, label: "Backend" },
  database: { gradient: "from-amber-500 via-orange-500 to-rose-500", icon: Database, label: "Database" },
};

function getCategoryTheme(course: CardCourse) {
  return (
    CATEGORY_THEMES[(course.category ?? "").toLowerCase()] ?? {
      gradient: getCourseColor(course),
      icon: BookOpen,
      label: course.category,
    }
  );
}

export default function CourseCard({ course }: { course: CardCourse }) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [checking, setChecking] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const theme = getCategoryTheme(course);
  const CategoryIcon = theme.icon;
  const showThumbnail = !!course.thumbnailUrl && !thumbFailed;
  // Chỉ gắn "Miễn phí" khi BE trả price = 0; chưa biết giá thì không hiện nhãn giá
  const priceLabel = formatCoursePrice(course.price);
  const isFree = hasKnownPrice(course.price) && course.price <= 0;

  const handleClick = async () => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setChecking(true);
    try {
      const myCourses = await meApi.getCourses();
      const alreadyEnrolled = myCourses.some((c) => c.courseId === course.id);
      if (alreadyEnrolled) {
        router.push(`/course/${course.id}`);
      } else {
        setShowPopup(true);
      }
    } catch {
      // Nếu lỗi thì cứ hiện popup bình thường
      setShowPopup(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Khóa học ${course.title}`}
        className={`course-card group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${checking ? "opacity-70 pointer-events-none" : ""}`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Ảnh bìa: thumbnail nếu có, nếu không thì gradient + icon theo danh mục */}
        <div className={`h-36 relative overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
          {showThumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.thumbnailUrl!}
                alt=""
                onError={() => setThumbFailed(true)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
              <CategoryIcon
                aria-hidden
                strokeWidth={1.5}
                className="absolute -bottom-5 -right-4 w-28 h-28 text-white/20 -rotate-12 transition-transform duration-500 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </>
          )}

          {/* Danh mục */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold">
            <CategoryIcon size={11} aria-hidden />
            {theme.label}
          </span>

          {/* Nhãn giá */}
          {priceLabel && (
            <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${isFree ? "bg-green-500 text-white" : "bg-white text-slate-800"}`}>
              {priceLabel}
            </span>
          )}

          <h3 className="absolute bottom-3 left-3 right-3 text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow">
            {course.title}
          </h3>
        </div>

        {/* Thông tin */}
        <div className="p-3">
          {/* Mô tả: luôn hiện trên mobile, hiện khi rê chuột trên màn hình lớn */}
          {course.description && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 overflow-hidden transition-all duration-300 md:max-h-0 md:opacity-0 md:group-hover:max-h-10 md:group-hover:opacity-100 md:group-hover:mb-2 md:group-focus-visible:max-h-10 md:group-focus-visible:opacity-100 md:group-focus-visible:mb-2 mb-2">
              {course.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500">{LEVEL_LABEL[course.level] ?? course.level}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-all duration-300 md:opacity-0 md:-translate-x-1 md:group-hover:opacity-100 md:group-hover:translate-x-0 md:group-focus-visible:opacity-100 md:group-focus-visible:translate-x-0">
              {isFree ? "Vào học" : "Xem lộ trình"}
              <ArrowRight size={13} aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {showPopup && (
        <CoursePopup course={course} onClose={() => setShowPopup(false)} />
      )}
    </>
  );
}
