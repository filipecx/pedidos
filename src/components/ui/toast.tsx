"use client";

import { useToastStore, ToastType } from "@/lib/toast-store";

const toastStyles: Record<ToastType, { bg: string; text: string; icon: string; border: string }> = {
  success: {
    bg: "bg-white dark:bg-gray-900",
    text: "text-gray-900 dark:text-white",
    border: "border-green-500/30",
    icon: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  },
  error: {
    bg: "bg-white dark:bg-gray-900",
    text: "text-gray-900 dark:text-white",
    border: "border-red-500/30",
    icon: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
  warning: {
    bg: "bg-white dark:bg-gray-900",
    text: "text-gray-900 dark:text-white",
    border: "border-amber-500/30",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  info: {
    bg: "bg-white dark:bg-gray-900",
    text: "text-gray-900 dark:text-white",
    border: "border-purple-500/30",
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  },
};

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "ℹ",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((t) => {
        const style = toastStyles[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border ${style.bg} ${style.border} ${style.text} animate-in slide-in-from-bottom-5 duration-200 transition-all`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${style.icon}`}>
                {icons[t.type]}
              </span>
              <p className="text-xs sm:text-sm font-semibold leading-snug">
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg shrink-0 transition-colors"
              aria-label="Fechar notificação"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
