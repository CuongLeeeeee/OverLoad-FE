"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course, getCourseColor, LEVEL_MAP } from "@/lib/types";
import { enrollmentsApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import CoursePopup from "./CoursePopup";

export default function CourseCard({ course }: { course: Course }) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [checking, setChecking] = useState(false);
  const color = getCourseColor(course);
  const levelInfo = LEVEL_MAP[course.level] ?? { label: course.level, badge: "free" };
  const isFree = levelInfo.badge === "free";

  const handleClick = () => {
  router.push(`/course/${course.id}`);
};

  return (
    <>
      <div
        className={`course-card block cursor-pointer ${checking ? "opacity-70 pointer-events-none" : ""}`}
        onClick={handleClick}
      >
        {/* Thumbnail */}
        <div className={`h-36 bg-gradient-to-br ${color} relative flex items-end justify-end p-3 overflow-hidden`}>
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute bottom-[-15px] left-[-15px] w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute top-3 left-3">
            <div className="text-white font-bold text-sm">{course.title}</div>
            <div className="text-white/80 text-xs mt-0.5">{course.category}</div>
          </div>
          <span className="text-white/30 font-bold text-3xl z-10">{course.level[0]}</span>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="font-semibold text-sm text-slate-800 mb-2 line-clamp-1">{course.title}</div>
          {isFree ? (
            <div className="flex justify-center">
              <span className="badge-free">Miễn phí</span>
            </div>
          ) : (
            <>
              <button className="w-full text-center py-1.5 rounded-xl border border-orange-200 text-orange-500 text-sm font-semibold hover:bg-orange-50 transition-colors">
                Xem lộ trình
              </button>
              <div className="flex gap-1 mt-2 justify-center">
                {levelInfo.badge === "plus" && <span className="badge-plus">Plus</span>}
                {levelInfo.badge === "pro" && (
                  <>
                    <span className="badge-plus">Plus</span>
                    <span className="badge-pro">Pro</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showPopup && (
        <CoursePopup course={course} onClose={() => setShowPopup(false)} />
      )}
    </>
  );
}