"use client";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

/**
 * Thay window.confirm: `const [confirm, confirmDialog] = useConfirm();`
 * rồi `if (!(await confirm({ title: "..." }))) return;` và render `{confirmDialog}`.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  };

  const dialog = options ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-white border border-slate-100 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${options.danger ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{options.title}</h3>
            {options.message && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{options.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => close(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
          >
            Hủy
          </button>
          <button
            autoFocus
            onClick={() => close(true)}
            className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all ${options.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {options.confirmLabel ?? "Đồng ý"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirm, dialog];
}
