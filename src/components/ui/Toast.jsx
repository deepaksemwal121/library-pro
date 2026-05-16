import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { ToastContext } from "./toastContext";

const toneStyles = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    iconClassName: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800",
    iconClassName: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-800",
    iconClassName: "text-amber-600",
  },
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    iconClassName: "text-blue-600",
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message = "", tone = "info", duration = 4500 }) => {
      const id = crypto.randomUUID();
      const nextToast = {
        id,
        title,
        message,
        tone: toneStyles[tone] ? tone : "info",
      };

      setToasts((currentToasts) => [nextToast, ...currentToasts].slice(0, 4));

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      success: (title, options = {}) => showToast({ ...options, title, tone: "success" }),
      error: (title, options = {}) => showToast({ ...options, title, tone: "error", duration: options.duration ?? 6500 }),
      warning: (title, options = {}) => showToast({ ...options, title, tone: "warning" }),
      info: (title, options = {}) => showToast({ ...options, title, tone: "info" }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          const Icon = styles.icon;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-md border p-3 text-sm shadow-lg ${styles.className}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${styles.iconClassName}`} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{toast.title}</div>
                {toast.message && <div className="mt-0.5 text-xs opacity-90">{toast.message}</div>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded p-0.5 opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
