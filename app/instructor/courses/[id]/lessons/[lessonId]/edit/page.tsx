"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { lessonsApi, coursesApi } from "@/lib/api";
import { Course, Lesson } from "@/lib/types";
import { 
  ArrowLeft, Layout, Server, Database, Plus, Trash2, 
  ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2, Save, Code, CheckSquare
} from "lucide-react";

interface StepItem {
  id: string;
  description: string;
  code: string;
  hasCode: boolean;
  hasCheckpoint: boolean;
  checkpointQuestion: string;
  checkpointAnswer: string;
  checkpointPercentage: number;
}

function parseSingleChunk(descHtml: string, code: string, hasCode: boolean): StepItem {
  let description = descHtml;
  let hasCheckpoint = false;
  let checkpointQuestion = "";
  let checkpointAnswer = "";
  let checkpointPercentage = 50;
  
  const cpRegex = /<checkpoint[^>]*percentage="([^"]*)"[^>]*question="([^"]*)"[^>]*answer="([^"]*)"[^>]*><\/checkpoint>/i;
  const cpMatch = descHtml.match(cpRegex);
  if (cpMatch) {
    hasCheckpoint = true;
    checkpointPercentage = parseFloat(cpMatch[1]) || 50;
    checkpointQuestion = cpMatch[2];
    checkpointAnswer = cpMatch[3];
    description = descHtml.replace(cpRegex, "").trim();
  }
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    description,
    code,
    hasCode,
    hasCheckpoint,
    checkpointQuestion,
    checkpointAnswer,
    checkpointPercentage
  };
}

function parseHtmlToSteps(html: string): StepItem[] {
  if (!html) {
    return [{
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      code: "",
      hasCode: false,
      hasCheckpoint: false,
      checkpointQuestion: "",
      checkpointAnswer: "",
      checkpointPercentage: 50
    }];
  }
  
  let cleanHtml = html.trim();
  if (cleanHtml.startsWith("<div") && cleanHtml.endsWith("</div>")) {
    const firstClose = cleanHtml.indexOf(">");
    const lastOpen = cleanHtml.lastIndexOf("<");
    if (firstClose !== -1 && lastOpen !== -1 && lastOpen > firstClose) {
      cleanHtml = cleanHtml.slice(firstClose + 1, lastOpen).trim();
    }
  }
  
  const preRegex = /([\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>)/gi;
  const matches = [...cleanHtml.matchAll(preRegex)];
  const stepsList: StepItem[] = [];
  
  if (matches.length === 0) {
    stepsList.push(parseSingleChunk(cleanHtml, "", false));
  } else {
    matches.forEach((m) => {
      const fullChunk = m[1];
      const codeContent = m[2]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
      
      const preTagStartIndex = fullChunk.toLowerCase().lastIndexOf("<pre");
      const description = fullChunk.slice(0, preTagStartIndex).trim();
      stepsList.push(parseSingleChunk(description, codeContent, true));
    });
    
    const lastIndex = matches[matches.length - 1].index ?? 0;
    const lastMatchLength = matches[matches.length - 1][0].length;
    const leftover = cleanHtml.slice(lastIndex + lastMatchLength).trim();
    if (leftover && leftover.replace(/<\/?div[^>]*>/gi, "").trim()) {
      stepsList.push(parseSingleChunk(leftover, "", false));
    }
  }
  return stepsList;
}

function compileStepsToHtml(steps: StepItem[]): string {
  let html = `<div style="font-family: Arial, sans-serif; line-height: 1.8;">\n`;
  steps.forEach(step => {
    html += `${step.description}\n`;
    if (step.hasCode && step.code) {
      const escapedCode = step.code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      html += `<pre>\n${escapedCode}\n</pre>\n`;
    }
    if (step.hasCheckpoint && step.checkpointQuestion && step.checkpointAnswer) {
      html += `<checkpoint percentage="${step.checkpointPercentage || 50}" question="${step.checkpointQuestion}" answer="${step.checkpointAnswer}"></checkpoint>\n`;
    }
  });
  html += `</div>`;
  return html;
}

function LessonStepsEditorContent() {
  const params = useParams();
  const router = useRouter();
  
  const courseId = Number(params.id);
  const lessonId = Number(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!courseId || !lessonId) return;

    setLoading(true);
    setErrorMsg("");
    
    Promise.all([
      coursesApi.getById(courseId),
      lessonsApi.getById(lessonId)
    ])
      .then(([c, l]) => {
        setCourse(c);
        setLesson(l);
        const parsed = parseHtmlToSteps(l.content || "");
        setSteps(parsed);
        setSelectedStepIndex(0);
      })
      .catch((err) => {
        setErrorMsg(err.message || "Không thể tải thông tin bài học.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId, lessonId]);

  const activeStep = steps[selectedStepIndex] || null;

  const updateActiveStep = (fields: Partial<StepItem>) => {
    setSteps(prev => prev.map((s, idx) => {
      if (idx === selectedStepIndex) {
        return { ...s, ...fields };
      }
      return s;
    }));
  };

  const handleAddStep = () => {
    const newStep: StepItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: `<p>Nhập mô tả của bước học mới tại đây...</p>`,
      code: `// Viết code tương ứng tại đây`,
      hasCode: false,
      hasCheckpoint: false,
      checkpointQuestion: "",
      checkpointAnswer: "",
      checkpointPercentage: 50
    };
    setSteps(prev => [...prev, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const handleDeleteStep = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (steps.length <= 1) {
      alert("Bài học cần tối thiểu 1 bước học.");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa bước học này không?")) return;

    const newSteps = steps.filter((_, idx) => idx !== index);
    setSteps(newSteps);
    
    if (selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length - 1);
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    setSteps(newSteps);
    setSelectedStepIndex(targetIndex);
  };

  const handleSave = async () => {
    if (!lesson) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    const compiledContent = compileStepsToHtml(steps);
    
    try {
      await lessonsApi.update(lessonId, {
        title: lesson.title,
        description: lesson.description || "",
        durationMinutes: lesson.durationMinutes,
        isFree: lesson.isFree,
        content: compiledContent,
        courseId
      });
      setSuccessMsg("Lưu nội dung bài học thành công!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi lưu bài học.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href={`/instructor/courses/${courseId}/lessons`}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold mb-2 group inline-flex"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Quay lại Bài giảng
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Code size={22} className="text-blue-600" />
            Thiết kế Steps: {lesson?.title}
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Khóa học: <span className="font-bold text-slate-700">{course?.title}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/course/${courseId}`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          >
            Xem trước giao diện học viên
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Lưu bài học
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl mb-6 text-xs font-semibold">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Step Card list */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Các bước ({steps.length})
            </h2>
            <button
              onClick={handleAddStep}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
            >
              <Plus size={12} /> Thêm Step
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
            {steps.map((step, idx) => {
              const isActive = idx === selectedStepIndex;
              // Clean description preview text
              const plainDesc = step.description
                .replace(/<[^>]*>/g, "")
                .substring(0, 45) || "(Không có mô tả)";

              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group select-none relative ${
                    isActive
                      ? "bg-white border-blue-300 shadow-[0_4px_16px_rgba(37,99,235,0.03)]"
                      : "bg-white border-slate-100 hover:border-slate-200"
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-blue-600 rounded-r" />}
                  
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Number badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      isActive 
                        ? "bg-blue-50 text-blue-600 border border-blue-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100"
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-none truncate ${isActive ? "text-blue-600" : "text-slate-800"}`}>
                        Step {idx + 1}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 truncate">
                        {plainDesc}
                      </p>
                      
                      {/* Meta badges */}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {step.hasCode && (
                          <span className="text-[7px] bg-slate-50 text-slate-500 border border-slate-200 px-1 rounded font-bold uppercase tracking-wider">
                            Code
                          </span>
                        )}
                        {step.hasCheckpoint && (
                          <span className="text-[7px] bg-amber-50 text-amber-600 border border-amber-100 px-1 rounded font-bold uppercase tracking-wider">
                            Checkpoint
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for steps */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleMoveStep(idx, "up", e)}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-50 text-slate-400 hover:text-slate-700 border border-slate-100 disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Di chuyển lên"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={(e) => handleMoveStep(idx, "down", e)}
                      disabled={idx === steps.length - 1}
                      className="p-1 rounded bg-slate-50 text-slate-400 hover:text-slate-700 border border-slate-100 disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteStep(idx, e)}
                      className="p-1 rounded bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100"
                      title="Xóa step"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Step content editor */}
        <div className="lg:col-span-8">
          {activeStep ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layout size={18} className="text-blue-500" />
                  Nội dung chi tiết Step {selectedStepIndex + 1}
                </h2>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Mã Step: {activeStep.id}
                </span>
              </div>

              {/* Instructions Editor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  Mô tả / Hướng dẫn bài học (Hỗ trợ định dạng HTML)
                </label>
                <textarea
                  className="w-full min-h-[160px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-y font-mono leading-relaxed"
                  placeholder="Ví dụ: <p>Trong bài học này chúng ta sẽ học về HTML Colors...</p>"
                  value={activeStep.description}
                  onChange={(e) => updateActiveStep({ description: e.target.value })}
                />
              </div>

              {/* Code block settings */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
                    checked={activeStep.hasCode}
                    onChange={(e) => updateActiveStep({ hasCode: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code size={14} className="text-slate-400" />
                    Chứa khối mã nguồn (Code Block)
                  </span>
                </label>

                {activeStep.hasCode && (
                  <div className="mt-3 flex flex-col gap-1.5 animate-[fadeIn_0.15s_ease-out]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Mã nguồn (Nhập code hiển thị và cho người học gõ thử)
                    </label>
                    <textarea
                      className="w-full min-h-[160px] p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-slate-950 transition-all font-mono leading-relaxed"
                      placeholder={`<div>Hello World</div>`}
                      value={activeStep.code}
                      onChange={(e) => updateActiveStep({ code: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Checkpoint Challenge settings */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
                    checked={activeStep.hasCheckpoint}
                    onChange={(e) => updateActiveStep({ hasCheckpoint: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-slate-400" />
                    Yêu cầu vượt qua thử thách Checkpoint để cuộn tiếp
                  </span>
                </label>

                {activeStep.hasCheckpoint && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Câu hỏi thử thách
                      </label>
                      <input
                        type="text"
                        className="px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Ví dụ: Thẻ nào dùng để tạo tiêu đề lớn nhất trong HTML?"
                        value={activeStep.checkpointQuestion}
                        onChange={(e) => updateActiveStep({ checkpointQuestion: e.target.value })}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Đáp án đúng
                      </label>
                      <input
                        type="text"
                        className="px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Ví dụ: h1"
                        value={activeStep.checkpointAnswer}
                        onChange={(e) => updateActiveStep({ checkpointAnswer: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        % Cuộn trang kích hoạt khóa cuộn
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="Ví dụ: 50"
                        value={activeStep.checkpointPercentage}
                        onChange={(e) => updateActiveStep({ checkpointPercentage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs shadow-sm flex flex-col items-center justify-center gap-3">
              <Code size={32} className="text-slate-300 animate-pulse" />
              <p className="font-bold text-slate-700">Chưa chọn bước học nào</p>
              <p className="text-slate-400">Chọn một bước học từ danh sách bên trái hoặc bấm "Thêm Step" để bắt đầu thiết kế.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LessonStepsEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    }>
      <LessonStepsEditorContent />
    </Suspense>
  );
}
