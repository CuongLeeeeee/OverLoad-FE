"use client";
import { useState, useRef, useEffect } from "react";
import parse, { domToReact, HTMLReactParserOptions, Element } from "html-react-parser";
import { Course, Lesson } from "@/lib/types";
import { BookOpen, MessageSquare, User, Clock, Users, Play, RotateCcw, Check, Loader2 } from "lucide-react";
import CodeEditor from "./CodeEditor";
import LivePreview from "./LivePreview";
import { getUser } from "@/lib/auth";
import { useLessonProgress } from "@/lib/useLessonProgress";

interface Props {
  lesson: Lesson;
  course: Course;
  activeTab: "desc" | "qa" | "author";
  onTabChange: (tab: "desc" | "qa" | "author") => void;
  onLessonCompleted?: (lessonId: number) => void;
  initialCompleted?: boolean;
}

// Detect language from lesson template (simple heuristic)
function detectLanguage(code: string): string {
  if (code.includes("<html") || code.includes("<div") || code.includes("<p>")) return "html";
  if (code.includes("{") && code.includes(":") && !code.includes("function")) return "css";
  return "javascript";
}

export default function LessonContent({
  lesson,
  course,
  activeTab,
  onTabChange,
  onLessonCompleted,
  initialCompleted = false,
}: Props) {
  const defaultLanguage = lesson.language || detectLanguage(lesson.template ?? "");
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "html" | "css">(defaultLanguage as "javascript" | "html" | "css");
  const [userCode, setUserCode] = useState(lesson.template ?? "");
  const [runKey, setRunKey] = useState(0);
  const [editorHeight, setEditorHeight] = useState(50); // percentage
  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalDividerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50); // percentage for left column
  const leftWidthRef = useRef(leftWidth);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [message, setMessage] = useState("");
  const { markLessonComplete, savingLessonId } = useLessonProgress();
  const isSavingProgress = savingLessonId === lesson.id;
  // Drag handling using pointer events for reliability
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const editorHeightRef = useRef(editorHeight);

  // keep a ref copy of editorHeight so the pointer handlers don't close over stale values
  useEffect(() => {
    editorHeightRef.current = editorHeight;
  }, [editorHeight]);

  useEffect(() => {
    leftWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    setIsCompleted(initialCompleted);
    setMessage("");
  }, [lesson.id, initialCompleted]);

  const handleMarkLessonComplete = async () => {
    const user = getUser();
    if (!user) {
      setMessage("Vui long dang nhap de luu tien trinh");
      return;
    }

    try {
      await markLessonComplete({ userId: user.id, lesson });
      setIsCompleted(true);
      setMessage("Da danh dau hoan thanh bai hoc");
      onLessonCompleted?.(lesson.id);
      window.setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Khong the luu tien trinh");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    // Use an effect that mounts once to avoid reattaching listeners during drag
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current || startHeightRef.current == null) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = e.clientY - startYRef.current;
      const newHeightPx = (startHeightRef.current / 100) * rect.height + delta;
      const newHeight = (newHeightPx / rect.height) * 100;
      if (newHeight >= 10 && newHeight <= 90) setEditorHeight(newHeight);
    };

    const finishDrag = () => {
      isDraggingRef.current = false;
      startHeightRef.current = null;
      pointerIdRef.current = null;
      (document.body as HTMLBodyElement).style.userSelect = "auto";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    const onPointerUp = (e?: PointerEvent) => {
      // try to release pointer capture if possible
      try {
        if (pointerIdRef.current != null && dividerRef.current?.releasePointerCapture) {
          dividerRef.current.releasePointerCapture(pointerIdRef.current);
        }
      } catch (err) {
        // ignore
      }
      finishDrag();
    };

    const onPointerDown = (e: PointerEvent) => {
      // start drag
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = editorHeightRef.current ?? editorHeight;
      pointerIdRef.current = (e as any).pointerId ?? null;
      (document.body as HTMLBodyElement).style.userSelect = "none";

      // ensure we continue to receive pointer events even if pointer moves outside the divider
      try {
        if (dividerRef.current?.setPointerCapture && pointerIdRef.current != null) {
          dividerRef.current.setPointerCapture(pointerIdRef.current);
        }
      } catch (err) {
        // ignore if not supported
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const divider = dividerRef.current;
    if (divider) divider.addEventListener("pointerdown", onPointerDown);
    return () => {
      if (divider) divider.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vertical divider (left/right) pointer handling
  useEffect(() => {
    const isDraggingVRef = { current: false } as { current: boolean };
    const startXRef = { current: 0 } as { current: number };
    const startLeftRef = { current: 0 } as { current: number };
    const pointerIdVRef = { current: null as number | null };

    const onMove = (e: PointerEvent) => {
      if (!isDraggingVRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = e.clientX - startXRef.current;
      const newLeftPx = (startLeftRef.current / 100) * rect.width + delta;
      const newLeft = (newLeftPx / rect.width) * 100;
      if (newLeft >= 15 && newLeft <= 85) setLeftWidth(newLeft);
    };

    const finish = () => {
      isDraggingVRef.current = false;
      pointerIdVRef.current = null;
      (document.body as HTMLBodyElement).style.userSelect = "auto";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    const onUp = () => {
      try {
        if (pointerIdVRef.current != null && verticalDividerRef.current?.releasePointerCapture) {
          verticalDividerRef.current.releasePointerCapture(pointerIdVRef.current);
        }
      } catch {}
      finish();
    };

    const onDown = (e: PointerEvent) => {
      isDraggingVRef.current = true;
      startXRef.current = e.clientX;
      startLeftRef.current = leftWidthRef.current ?? leftWidth;
      pointerIdVRef.current = (e as any).pointerId ?? null;
      (document.body as HTMLBodyElement).style.userSelect = "none";
      try {
        if (verticalDividerRef.current?.setPointerCapture && pointerIdVRef.current != null) {
          verticalDividerRef.current.setPointerCapture(pointerIdVRef.current);
        }
      } catch {}
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    const vdiv = verticalDividerRef.current;
    if (vdiv) vdiv.addEventListener("pointerdown", onDown);
    return () => {
      if (vdiv) vdiv.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div ref={containerRef} className="flex-1 overflow-hidden flex flex-row">
          {/* Left: Content */}
          <div style={{ width: `${leftWidth}%` }} className="overflow-y-auto border-r border-slate-100 p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold text-slate-800">{lesson.title}</h2>
              {isCompleted && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full shrink-0">
                  <Check size={16} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-600">Hoan thanh</span>
                </div>
              )}
            </div>

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

            {message && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {message}
              </div>
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

            {/* Lesson content - displayed as formatted HTML/text */}
            {lesson.content && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Nội dung bài học</h3>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  <style>{`
                    .lesson-content h1 { font-size: 1.875rem; font-weight: 700; margin: 1.5rem 0 1rem; color: #1e293b; }
                    .lesson-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.75rem; color: #334155; }
                    .lesson-content h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; color: #475569; }
                    .lesson-content h4 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: #475569; }
                    .lesson-content h5, .lesson-content h6 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0; color: #475569; }
                    .lesson-content p { margin: 0.75rem 0; line-height: 1.6; }
                    .lesson-content a { color: #2563eb; text-decoration: underline; }
                    .lesson-content a:hover { color: #1d4ed8; }
                    .lesson-content ul, .lesson-content ol { margin: 1rem 0; padding-left: 2rem; }
                    .lesson-content li { margin: 0.5rem 0; }
                    .lesson-content code { background: #f1f5f9; color: #e11d48; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: 'Courier New', monospace; font-size: 0.875em; }
                    .lesson-content pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
                    .lesson-content pre code { background: none; color: inherit; padding: 0; }
                    .lesson-content blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin: 1rem 0; color: #64748b; font-style: italic; }
                    .lesson-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
                    .lesson-content th, .lesson-content td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left; }
                    .lesson-content th { background: #f1f5f9; font-weight: 600; }
                    .lesson-content strong, .lesson-content b { font-weight: 700; color: #1e293b; }
                    .lesson-content em, .lesson-content i { font-style: italic; }
                  `}</style>
                  <div className="lesson-content">
                    {parse(lesson.content, {
  replace(node) {
    if (node instanceof Element && node.name === "pre") {
      const code = node.children
        .map((c: any) => c.type === "text" ? c.data : c.children?.map((cc: any) => cc.data ?? "").join("") ?? "")
        .join("");
      return (
        <pre
          onClick={() => {
            setUserCode(code.trimEnd());
            setRunKey(k => k + 1);  // tự chạy luôn sau khi copy
          }}
          title="Bấm để copy vào editor"
          style={{
            background: "#1e293b", color: "#e2e8f0", padding: "1rem",
            borderRadius: "0.5rem", cursor: "pointer", position: "relative",
            border: "2px solid transparent", transition: "border-color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
        >
          <span style={{ position: "absolute", top: 6, right: 8, fontSize: 10, color: "#64748b" }}>
            ▶ Bấm để chạy
          </span>
          {domToReact(node.children as any)}
        </pre>
      );
    }
  },
})}
                  </div>
                </div>
              </div>
            )}

            {!isCompleted && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <button
                  onClick={handleMarkLessonComplete}
                  disabled={isSavingProgress}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors text-base"
                >
                  {isSavingProgress ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Dang luu...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Danh dau hoan thanh bai hoc
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Vertical divider: draggable to resize left/right */}
          <div
            ref={verticalDividerRef}
            className="w-2 cursor-col-resize shrink-0 transition-colors"
            style={{ background: 'transparent' }}
          />

          {/* Right: Code Editor + Preview (vertical split) */}
          <div style={{ width: `${100 - leftWidth}%` }} className="overflow-hidden flex flex-col border-l border-slate-100">
            {/* Top: Code Editor */}
            <div style={{ height: `${editorHeight}%` }} className="overflow-hidden flex flex-col border-b border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-white border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Soạn thảo code</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setUserCode(lesson.template ?? ""); setRunKey(k => k + 1); }}
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

              <div className="bg-[#1e293b] px-4 py-2 flex items-center gap-3 shrink-0">
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

              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={userCode}
                  language={selectedLanguage}
                  onChange={setUserCode}
                />
              </div>
            </div>

            {/* Resizable Divider */}
            <div
              ref={dividerRef}
              className="h-1 bg-slate-300 hover:bg-blue-500 cursor-row-resize shrink-0 transition-colors"
            />

            {/* Bottom: Live Preview */}
            <div style={{ height: `${100 - editorHeight}%` }} className="overflow-hidden flex flex-col">
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
