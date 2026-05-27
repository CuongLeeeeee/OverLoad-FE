"use client";
import { useState } from "react";

export default function DebugPage() {
  const [baseUrl, setBaseUrl] = useState("https://localhost:53483");
  const [path, setPath] = useState("/courses");
  const [params, setParams] = useState("page=1&pageSize=10");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");

  const [result, setResult] = useState<{
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
    error?: string;
    fullUrl?: string;
    duration?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const fullUrl = `${baseUrl}${path}${params ? "?" + params : ""}`;
    const t0 = Date.now();
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(fullUrl, {
        method,
        headers,
        body: method !== "GET" && body ? body : undefined,
      });

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      let resBody: unknown;
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("json")) {
        resBody = await res.json().catch((e) => `(parse error: ${e.message})`);
      } else {
        resBody = await res.text();
      }

      setResult({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        fullUrl,
        duration: Date.now() - t0,
      });
    } catch (e: unknown) {
      setResult({
        error: e instanceof Error ? e.message : String(e),
        fullUrl,
        duration: Date.now() - t0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick presets based on API docs
  const presets = [
    { label: "GET /courses", path: "/courses", params: "page=1&pageSize=10", method: "GET", body: "" },
    { label: "GET /courses (no params)", path: "/courses", params: "", method: "GET", body: "" },
    { label: "GET /api/courses", path: "/api/courses", params: "page=1&pageSize=10", method: "GET", body: "" },
    { label: "GET /courses/1", path: "/courses/1", params: "", method: "GET", body: "" },
    { label: "GET /lessons", path: "/lessons", params: "", method: "GET", body: "" },
    { label: "POST /auth/login", path: "/auth/login", params: "", method: "POST", body: JSON.stringify({ email: "user@example.com", password: "123456" }, null, 2) },
    { label: "POST /users (register)", path: "/users", params: "", method: "POST", body: JSON.stringify({ email: "test@example.com", password: "123456", fullName: "Test User", role: "Student" }, null, 2) },
  ];

  const statusColor = result?.status
    ? result.status < 300 ? "text-green-600" : result.status < 500 ? "text-yellow-600" : "text-red-600"
    : "text-red-600";

  return (
    <div style={{ fontFamily: "monospace", padding: 24, background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#60a5fa" }}>
        🔧 API Debug Tool
      </h1>

      {/* Presets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>QUICK PRESETS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => { setPath(p.path); setParams(p.params); setMethod(p.method); setBody(p.body); }}
              style={{ padding: "4px 10px", background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: 6, color: "#93c5fd", fontSize: 11, cursor: "pointer" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>BASE URL</label>
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }} />
          </div>
          <div style={{ width: 90 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>METHOD</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }}>
              {["GET","POST","PUT","PATCH","DELETE"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>PATH</label>
            <input value={path} onChange={e => setPath(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>QUERY PARAMS (không cần ?)</label>
            <input value={params} onChange={e => setParams(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>JWT TOKEN (nếu cần)</label>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token here..."
            style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }} />
        </div>

        {method !== "GET" && (
          <div>
            <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>REQUEST BODY (JSON)</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              style={{ width: "100%", padding: "6px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13, resize: "vertical" }} />
          </div>
        )}
      </div>

      {/* Send button */}
      <button onClick={run} disabled={loading}
        style={{ padding: "8px 24px", background: loading ? "#1e3a5f" : "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginBottom: 20 }}>
        {loading ? "⏳ Đang gửi..." : "▶ Gửi Request"}
      </button>

      {/* Result */}
      {result && (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, border: "1px solid #334155" }}>
          <div style={{ marginBottom: 10, display: "flex", gap: 20, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>URL: <span style={{ color: "#60a5fa" }}>{result.fullUrl}</span></span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{result.duration}ms</span>
          </div>

          {result.error ? (
            <div>
              <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 4 }}>❌ Network Error</div>
              <div style={{ color: "#fca5a5", fontSize: 13 }}>{result.error}</div>
              <div style={{ marginTop: 12, padding: 10, background: "#450a0a", borderRadius: 6, fontSize: 12, color: "#fca5a5", lineHeight: 1.6 }}>
                <strong>Nguyên nhân thường gặp:</strong><br/>
                • CORS chưa bật trên BE<br/>
                • BE chưa chạy hoặc sai port<br/>
                • HTTPS self-signed cert bị reject (thử HTTP)<br/>
                • Sai base URL
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 10, display: "flex", gap: 16 }}>
                <span className={statusColor} style={{ fontWeight: 700, fontSize: 16, color: result.status! < 300 ? "#4ade80" : result.status! < 500 ? "#facc15" : "#f87171" }}>
                  {result.status} {result.statusText}
                </span>
              </div>

              {/* Hint for 404 */}
              {result.status === 404 && (
                <div style={{ marginBottom: 12, padding: 10, background: "#422006", borderRadius: 6, fontSize: 12, color: "#fed7aa", lineHeight: 1.6 }}>
                  <strong>404 - Không tìm thấy endpoint.</strong> Hãy thử:<br/>
                  • Đổi path: <code>/courses</code> → <code>/api/courses</code><br/>
                  • Kiểm tra xem BE có yêu cầu prefix <code>/api</code> không<br/>
                  • Thử bỏ query params xem có bớt 404 không<br/>
                  • Kiểm tra Swagger UI của BE (thường ở <code>/swagger</code>)
                </div>
              )}

              {/* Response headers */}
              <details style={{ marginBottom: 10 }}>
                <summary style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer", marginBottom: 4 }}>Response Headers</summary>
                <pre style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
                  {JSON.stringify(result.headers, null, 2)}
                </pre>
              </details>

              {/* Response body */}
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>RESPONSE BODY</div>
              <pre style={{ background: "#0f172a", padding: 12, borderRadius: 6, fontSize: 12, color: "#86efac", overflow: "auto", maxHeight: 400, margin: 0, lineHeight: 1.5 }}>
                {typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
