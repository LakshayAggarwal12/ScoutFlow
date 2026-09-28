import { createContext, useCallback, useContext, useRef, useState } from "react";
import { IconAlert, IconCheckCircle, IconClose, IconInfo } from "../components/icons.jsx";

const ToastContext = createContext(null);

const STYLES = {
  success: {
    wrap: "border-emerald-200 dark:border-emerald-900/60",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    Icon: IconCheckCircle,
    label: "Success",
  },
  error: {
    wrap: "border-red-200 dark:border-red-900/60",
    icon: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    Icon: IconAlert,
    label: "Error",
  },
  info: {
    wrap: "border-slate-200 dark:border-slate-700",
    icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    Icon: IconInfo,
    label: "Notice",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-3 top-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
      >
        {toasts.map((t) => {
          const { wrap, icon: iconClass, Icon: ToastIcon } = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 p-3.5 shadow-lifted backdrop-blur animate-toast-in dark:bg-slate-900/95 ${wrap}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                <ToastIcon size={16} />
              </span>
              <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium text-ink dark:text-slate-100">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="btn-icon-sm -mr-1 -mt-1"
              >
                <IconClose size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

