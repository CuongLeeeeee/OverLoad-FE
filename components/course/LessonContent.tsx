"use client";
import { useState } from "react";
import { Course, Lesson } from "@/lib/types";
import { BookOpen, MessageSquare, User, Clock, Users, Play, RotateCcw } from "lucide-react";
import CodeEditor from "./CodeEditor";
import LivePreview from "./LivePreview";

interface Props {
  lesson: Lesson;
  course: Course;
  activeTab: "desc" | "qa" | "author";
  onTabChange: (tab: "desc" | "qa" | "author") => void;
}

// Detect language from lesson content (simple heuristic)
function detectLanguage(content: string): string {
  if (content.includes("<html") || content.includes("<div") || content.includes("<p>")) return "html";
  if (content.includes("{") && content.includes(":") && !content.includes("function")) return "css";
  return "javascript";
}

export default function LessonContent({ lesson, course, activeTab, onTabChange }: Props) {
  const defaultLanguage = lesson.language || detectLanguage(lesson.content ?? "");
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "html" | "css">(defaultLanguage as "javascript" | "html" | "css");
  const [userCode, setUserCode] = useState(lesson.content ?? "");
  const [runKey, setRunKey] = useState(0);

  const tabs = [
    { id: "desc" as const, label: "Mô tả", icon: BookOpen },
    { id: "qa" as const, label: "Hỏi & Đáp", icon: MessageSquare },
    { id: "author" as const, label: "Ghi chú", icon: User },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100 bg-white shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Mô tả */}
      {activeTab === "desc" && (
        <div className="flex-1 overflow-hidden flex">
          {/* Left: lesson info */}
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-3">{lesson.title}</h2>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {lesson.durationMinutes} phút
              </span>
              {lesson.isFree && (
                <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-0.5 rounded-full">
                  Miễn phí
                </span>
              )}
            </div>

            {/* Description */}
            {lesson.description && (
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{lesson.description}</p>
            )}

            {/* Course stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <BookOpen size={16} className="text-orange-500" />
                <div>
                  <div className="text-sm font-bold text-slate-800">{course.level}</div>
                  <div className="text-xs text-slate-400">Trình độ</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <Users size={16} className="text-orange-500" />
                <div>
                  <div className="text-sm font-bold text-slate-800">{course.category}</div>
                  <div className="text-xs text-slate-400">Danh mục</div>
                </div>
              </div>
            </div>

            {/* Code editor for lesson content */}
            {lesson.content && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Nội dung bài học</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setUserCode(lesson.content); setRunKey(k => k + 1); }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw size={12} /> Reset
                    </button>
                    <button
                      onClick={() => setRunKey(k => k + 1)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md font-semibold"
                    >
                      <Play size={11} fill="white" /> Chạy
                    </button>
                  </div>
                </div>

                <div className="editor-container">
                  <div className="bg-[#1e293b] px-4 py-2 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as "javascript" | "html" | "css")}
                      className="ml-2 bg-transparent text-slate-300 text-xs font-medium border border-slate-500 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:border-blue-400"
                    >
                      <option value="javascript">JavaScript (script.js)</option>
                      <option value="html">HTML (index.html)</option>
                      <option value="css">CSS (style.css)</option>
                    </select>
                  </div>
                  <CodeEditor
                    value={userCode}
                    language={selectedLanguage}
                    onChange={setUserCode}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: live preview */}
          <div className="w-[44%] min-w-[340px] border-l border-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
              <span className="text-xs font-semibold text-slate-500">KẾT QUẢ</span>
              <button
                onClick={() => setRunKey(k => k + 1)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Play size={10} /> Chạy lại
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-white">
              <LivePreview code={userCode} language={selectedLanguage} runKey={runKey} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "qa" && (
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-2">
          <MessageSquare size={36} className="text-slate-200" />
          <p className="text-sm">Chưa có câu hỏi nào.</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            Đặt câu hỏi
          </button>
        </div>
      )}

      {activeTab === "author" && (
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="font-semibold text-slate-700 mb-2">Ghi chú của bạn</h3>
          <textarea
            className="w-full h-48 input-field resize-none"
            placeholder="Ghi chú của bạn về bài học này..."
          />
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            Lưu ghi chú
          </button>
        </div>
      )}
    </div>
  );
}
