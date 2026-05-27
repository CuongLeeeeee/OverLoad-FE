"use client";
import { Course, Lesson } from "@/lib/types";
import { X, CheckCircle2, Circle, Clock } from "lucide-react";

interface Props {
  course: Course;
  lessons: Lesson[];
  activeLessonId: number | null;
  onLessonSelect: (lessonId: number) => void;
  onClose: () => void;
}

export default function LessonSidebar({ course, lessons, activeLessonId, onLessonSelect, onClose }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs font-semibold text-slate-700">Nội dung khóa học</div>
          <div className="text-xs text-slate-400 mt-0.5">{lessons.length} bài học</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Course info */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="text-sm font-semibold text-slate-800 line-clamp-2">{course.title}</div>
        <div className="text-xs text-slate-400 mt-1">{course.category} · {course.level}</div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto">
        {lessons.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">Chưa có bài học nào</div>
        ) : (
          lessons.map((lesson, idx) => {
            const isActive = lesson.id === activeLessonId;
            return (
              <button
                key={lesson.id}
                onClick={() => onLessonSelect(lesson.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-start gap-3 transition-colors hover:bg-slate-50 ${isActive ? "bg-orange-50" : ""}`}
              >
                {/* Index / check */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${isActive ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${isActive ? "text-orange-600" : "text-slate-700"}`}>
                    {lesson.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={10} /> {lesson.durationMinutes} phút
                    </span>
                    {lesson.isFree && (
                      <span className="text-xs text-green-600 font-medium">Miễn phí</span>
                    )}
                  </div>
                  {lesson.description && (
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{lesson.description}</div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
