import { marked } from "marked";

// Thẻ HTML cấp khối thường gặp trong content dạng HTML (do trình soạn bài sinh ra)
const HTML_BLOCK_RE = /<(p|div|pre|h[1-6]|ul|ol|li|section|article|table|blockquote|br|html|body)\b[^>]*>/i;

export function isHtmlContent(content: string): boolean {
  // Bỏ khối ```code``` và `code` trước khi dò: bài Markdown về HTML hay viết `<div>` trong code
  const withoutCode = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  return HTML_BLOCK_RE.test(withoutCode);
}

/**
 * Content bài học có thể là HTML (trình soạn bài) hoặc Markdown (dữ liệu từ BE v1).
 * Luôn trả về HTML. Khối ```code``` trong Markdown → <pre><code>, nên mỗi khối code vẫn là một step.
 */
export function toLessonHtml(content: string | null | undefined): string {
  if (!content) return "";
  if (isHtmlContent(content)) return content;
  return marked.parse(content, { async: false, gfm: true, breaks: false });
}

// Một số bài lưu content là nguyên trang HTML (<!DOCTYPE>, <html>, <head>, <body>).
// Chỉ lấy phần trong <body>, vì các thẻ cấp tài liệu không được nằm trong <div>.
export function extractBodyHtml(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1];
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?(html|body)[^>]*>/gi, "");
}

// ─── Steps ───────────────────────────────────────────────────────────────────
// Định dạng lưu (trình soạn bài):
//   <div class="lesson-steps">
//     <section data-step="1">mô tả <pre>code</pre> <checkpoint .../></section>
//     ...
//   </div>
// Bài cũ không có <section data-step>: chia theo <pre>, checkpoint nằm ngay sau
// </pre> thuộc về step chứa <pre> đó.

export interface StepCheckpoint {
  question: string;
  answer: string;
  percentage: number;
}

export interface LessonStep {
  /** HTML mô tả của step (không gồm khối code chính và checkpoint) */
  description: string;
  /** Code của step; null nếu step không có code */
  code: string | null;
  /** Ngôn ngữ của khối code nếu content có ghi (```html → "html"), vd từ Markdown */
  language?: string | null;
  checkpoint: StepCheckpoint | null;
}

const STEP_SECTION_RE = /<section\s+data-step[^>]*>([\s\S]*?)<\/section>/gi;
const CHECKPOINT_RE = /<checkpoint\b([^>]*?)\/?>(?:\s*<\/checkpoint>)?/gi;
const LEADING_CHECKPOINTS_RE = /^(?:\s*<checkpoint\b[^>]*?\/?>(?:\s*<\/checkpoint>)?)+/i;
const PRE_RE = /<pre[^>]*>([\s\S]*?)<\/pre>/i;
const PRE_GLOBAL_RE = /<pre[^>]*>[\s\S]*?<\/pre>/gi;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function readAttr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

function unwrapOuterDiv(html: string): string {
  if (html.startsWith("<div") && html.endsWith("</div>")) {
    const firstClose = html.indexOf(">");
    const lastOpen = html.lastIndexOf("<");
    if (firstClose !== -1 && lastOpen > firstClose) return html.slice(firstClose + 1, lastOpen).trim();
  }
  return html;
}

function hasVisibleContent(html: string): boolean {
  return html.replace(/<\/?div[^>]*>/gi, "").trim().length > 0;
}

function splitLegacy(html: string): string[] {
  const chunks: string[] = [];
  let last = 0;
  for (const m of html.matchAll(PRE_GLOBAL_RE)) {
    const end = (m.index ?? 0) + m[0].length;
    chunks.push(html.slice(last, end));
    last = end;
  }
  let leftover = html.slice(last);

  // Checkpoint ngay sau </pre> thuộc về step trước
  for (let i = 1; i <= chunks.length; i++) {
    const current = i < chunks.length ? chunks[i] : leftover;
    const lead = current.match(LEADING_CHECKPOINTS_RE);
    if (!lead) continue;
    chunks[i - 1] += lead[0];
    const rest = current.slice(lead[0].length);
    if (i < chunks.length) chunks[i] = rest;
    else leftover = rest;
  }

  if (chunks.length === 0) return [html];
  if (hasVisibleContent(leftover)) chunks.push(leftover);
  return chunks;
}

function parseStepChunk(chunk: string): LessonStep {
  let checkpoint: StepCheckpoint | null = null;
  const withoutCheckpoint = chunk.replace(CHECKPOINT_RE, (_m, attrs: string) => {
    const question = readAttr(attrs, "question");
    const answer = readAttr(attrs, "answer");
    if (!checkpoint && question && answer) {
      checkpoint = { question, answer, percentage: parseFloat(readAttr(attrs, "percentage") ?? "") || 50 };
    }
    return "";
  });

  const pre = withoutCheckpoint.match(PRE_RE);
  let code: string | null = null;
  let language: string | null = null;
  if (pre) {
    const lang = pre[0].match(/(?:class="[^"]*\blanguage-([\w+-]+)|data-language="([\w+-]+)")/i);
    language = lang ? (lang[1] ?? lang[2]).toLowerCase() : null;
    // Markdown sinh <pre><code class="language-x">…</code></pre>
    const inner = pre[1].replace(/^\s*<code[^>]*>([\s\S]*?)<\/code>\s*$/i, "$1");
    code = decodeEntities(inner).replace(/^\s*\n/, "").replace(/\s+$/, "");
  }
  const description = (pre ? withoutCheckpoint.replace(PRE_RE, "") : withoutCheckpoint).trim();
  return { description, code, language, checkpoint };
}

export type EditorLanguage = "javascript" | "html" | "css";

const LANGUAGE_ALIASES: Record<string, EditorLanguage> = {
  html: "html", htm: "html", xml: "html", svg: "html",
  css: "css", scss: "css", sass: "css",
  js: "javascript", javascript: "javascript", jsx: "javascript", ts: "javascript", typescript: "javascript",
};

/** Map ngôn ngữ ghi trong content sang ngôn ngữ editor hỗ trợ; null nếu không hỗ trợ (vd sql). */
export function toEditorLanguage(language: string | null | undefined): EditorLanguage | null {
  return language ? LANGUAGE_ALIASES[language.toLowerCase()] ?? null : null;
}

/** Đoán ngôn ngữ từ nội dung code khi content không ghi rõ. */
export function guessEditorLanguage(code: string): EditorLanguage {
  if (/<\/?[a-z][a-z0-9-]*(\s[^>]*)?>|<!doctype/i.test(code)) return "html";
  const looksLikeJs = /\b(function|const|let|var|return|console\.|=>|import|export)\b|=>/.test(code);
  if (!looksLikeJs && /[^{}]+\{[^{}]*[a-z-]+\s*:[^{}]*\}/i.test(code)) return "css";
  return "javascript";
}

/** Tách content (HTML hoặc Markdown, định dạng mới hoặc cũ) thành danh sách step. */
export function parseLessonSteps(content: string | null | undefined): LessonStep[] {
  const html = unwrapOuterDiv(extractBodyHtml(toLessonHtml(content)).trim());
  if (!html) return [];
  const sections = [...html.matchAll(STEP_SECTION_RE)].map((m) => m[1]);
  const chunks = sections.length > 0 ? sections : splitLegacy(html);
  return chunks.map(parseStepChunk);
}

/** Ghép step thành HTML để lưu; mỗi step nằm trong <section data-step> nên step không có code vẫn giữ được ranh giới. */
export function compileLessonSteps(steps: LessonStep[]): string {
  const sections = steps.map((step, i) => {
    let body = `${step.description}\n`;
    if (step.code !== null && step.code !== "") {
      body += `<pre>\n${escapeHtml(step.code)}\n</pre>\n`;
    }
    if (step.checkpoint && step.checkpoint.question && step.checkpoint.answer) {
      const { question, answer, percentage } = step.checkpoint;
      body += `<checkpoint percentage="${percentage || 50}" question="${escapeAttr(question)}" answer="${escapeAttr(answer)}"></checkpoint>\n`;
    }
    return `<section data-step="${i + 1}">\n${body}</section>`;
  });
  return `<div class="lesson-steps">\n${sections.join("\n")}\n</div>`;
}
