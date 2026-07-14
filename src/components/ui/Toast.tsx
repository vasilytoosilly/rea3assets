"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Toast — Global notification system (module-level singleton state)
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toastList: Toast[] = [];

export function showToast(type: ToastType, message: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toastList = [...toastList, { id, type, message }];
  toastListeners.forEach((fn) => fn(toastList));
  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== id);
    toastListeners.forEach((fn) => fn(toastList));
  }, 4000);
}

export function dismissToast(id: string) {
  toastList = toastList.filter((t) => t.id !== id);
  toastListeners.forEach((fn) => fn(toastList));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts);
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-[var(--status-approved)]" />,
    error: <AlertCircle size={18} className="text-[var(--status-deprecated)]" />,
    warning: <AlertTriangle size={18} className="text-[var(--status-review)]" />,
    info: <Info size={18} className="text-[var(--accent)]" />,
  };

  const borders: Record<ToastType, string> = {
    success: "border-[var(--status-approved)]/30",
    error: "border-[var(--status-deprecated)]/30",
    warning: "border-[var(--status-review)]/30",
    info: "border-[var(--accent-border)]",
  };

  const backgrounds: Record<ToastType, string> = {
    success: "bg-[var(--status-approved)]/10",
    error: "bg-[var(--status-deprecated)]/10",
    warning: "bg-[var(--status-review)]/10",
    info: "bg-[var(--accent-muted)]",
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-lg border ${borders[toast.type]} ${backgrounds[toast.type]} px-4 py-3 shadow-lg animate-[slideIn_0.2s_ease-out]`}
          style={{ minWidth: "280px", maxWidth: "400px" }}
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm text-[var(--text-primary)]">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
