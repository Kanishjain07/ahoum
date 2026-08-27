import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const ToastContext = createContext(null);

const KINDS = {
  error: { icon: 'alert', accent: 'text-error-container' },
  success: { icon: 'check-circle', accent: 'text-primary-fixed-dim' },
  info: { icon: 'info', accent: 'text-surface-variant' },
};

/**
 * Bottom-right toasts on a dark slate surface, per the design system's
 * Feedback section. Used for outcomes that are not the page's own state —
 * chiefly booking 409s, which are expected results rather than page errors.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = (seq.current += 1);
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.duration ?? 6000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (title, body) => push({ kind: 'success', title, body }),
      error: (title, body) => push({ kind: 'error', title, body }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-lg right-lg z-[60] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-sm"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const kind = KINDS[toast.kind] || KINDS.info;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-md rounded-lg bg-inverse-surface p-md pr-lg shadow-md animate-fade-in-up"
            >
              <Icon name={kind.icon} size={20} className={`mt-0.5 shrink-0 ${kind.accent}`} />
              <div className="flex-1">
                <p className="text-label-md text-surface-container-lowest">{toast.title}</p>
                {toast.body && (
                  <p className="mt-xs text-body-sm text-inverse-on-surface/70">{toast.body}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-inverse-on-surface/60 transition-colors hover:text-surface-container-lowest"
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={16} />
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
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
