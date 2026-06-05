"use client";
import { Course, Lesson, LessonWithProgress, CourseProgress } from "@/lib/types";
import { X, CheckCircle2, Circle, Clock } from "lucide-react";
import CourseProgressDisplay from "./CourseProgress";

interface Props {
  course: Course;
  lessons: (Lesson | LessonWithProgress)[];
  activeLessonId: number | null;
  onLessonSelect: (lessonId: number) => void;
  onClose: () => void;
  courseProgress?: CourseProgress | null;
  progressLoading?: boolean;
}

export default function LessonSidebar({ 
  course, 
  lessons, 
  activeLessonId, 
  onLessonSelect, 
  onClose,
  courseProgress,
  progressLoading
}: Props) {
  console.log("LessonSidebar received courseProgress:", courseProgress);
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => "completed" in l && l.completed).length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const displayProgress = courseProgress ? {
    ...courseProgress,
    progressPercentage: courseProgress.totalLessons > 0 ? Math.round((courseProgress.completedLessons / courseProgress.totalLessons) * 100) : 0
  } : {
    courseId: course.id,
    courseTitle: course.title,
    progressPercentage,
    completedLessons,
    totalLessons,
    totalWatchTimeSeconds: 0,
    completed: completedLessons === totalLessons && totalLessons > 0,
  } as CourseProgress;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Course Progress Display */}
      <CourseProgressDisplay progress={displayProgress} loading={progressLoading} />

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-semibold text-slate-800">Nội dung khóa học</div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="font-semibold text-blue-600">{displayProgress.progressPercentage}%</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{displayProgress.completedLessons}/{displayProgress.totalLessons} bài học hoàn thành</span>
          </div>
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
            const isCompleted = "completed" in lesson && lesson.completed;
            const watchPercentage = "watchPercentage" in lesson ? lesson.watchPercentage : 0;
            
            return (
              <button
                key={lesson.id}
                onClick={() => onLessonSelect(lesson.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-start gap-3 transition-colors hover:bg-slate-50 ${isActive ? "bg-orange-50" : ""}`}
              >
                {/* Index / check */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                  isCompleted 
                    ? "bg-green-500 text-white" 
                    : isActive 
                    ? "bg-orange-500 text-white" 
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${isActive ? "text-orange-600" : "text-slate-700"}`}>
                    {lesson.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={10} /> {lesson.durationMinutes} phút
                    </span>
                    {isCompleted ? (
                      <span className="text-xs text-green-600 font-semibold">✓ Hoàn thành</span>
                    ) : (
                      "isFree" in lesson && lesson.isFree && (
                        <span className="text-xs text-green-600 font-medium">Miễn phí</span>
                      )
                    )}
                  </div>
                  
                  {/* Progress bar for lesson */}
                  {!isCompleted && "watchPercentage" in lesson && watchPercentage > 0 && (
                    <div className="mt-1.5">
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-blue-400 h-full rounded-full" 
                          style={{ width: `${watchPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
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
