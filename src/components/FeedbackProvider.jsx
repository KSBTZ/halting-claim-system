import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { FeedbackContext } from '../hooks/useFeedback';

const TOAST_DURATION = 3500;

const toastTones = {
  success: { icon: CircleCheck, iconClass: 'bg-brand-50 text-brand-700' },
  error: { icon: CircleAlert, iconClass: 'bg-red-50 text-red-600' },
  info: { icon: Info, iconClass: 'bg-gray-100 text-gray-700' },
};

const dialogTones = {
  default: { icon: Info, iconClass: 'bg-brand-50 text-brand-700', button: 'btn-primary' },
  danger: { icon: TriangleAlert, iconClass: 'bg-red-50 text-red-600', button: 'btn-danger' },
};

let nextToastId = 0;

const ConfirmDialog = ({ dialog, onClose }) => {
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default' } = dialog;
  const { icon: Icon, iconClass, button } = dialogTones[tone] || dialogTones.default;
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    // Default to the safe choice so Enter never triggers a destructive action by accident
    (cancelRef.current || confirmRef.current)?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 animate-fadeIn bg-gray-950/50 backdrop-blur-[2px]" onClick={() => onClose(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-md animate-scaleIn rounded-2xl bg-white p-6 shadow-2xl"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="pt-0.5">
            <h2 id="confirm-title" className="font-heading text-lg font-bold text-gray-900">{title}</h2>
            {message && <p id="confirm-message" className="mt-1.5 text-sm leading-relaxed text-gray-600">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {cancelLabel && (
            <button type="button" ref={cancelRef} className="btn-ghost" onClick={() => onClose(false)}>
              {cancelLabel}
            </button>
          )}
          <button type="button" ref={confirmRef} className={button} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, { tone = 'success', icon } = {}) => {
    const id = ++nextToastId;
    setToasts((current) => [...current.slice(-2), { id, message, tone, icon }]);
    setTimeout(() => dismissToast(id), TOAST_DURATION);
  }, [dismissToast]);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        dialogRef.current?.resolve(false);
        dialogRef.current = { ...options, resolve };
        setDialog(dialogRef.current);
      }),
    []
  );

  const closeDialog = useCallback((result) => {
    dialogRef.current?.resolve(result);
    dialogRef.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        {toasts.map(({ id, message, tone, icon }) => {
          const toneStyle = toastTones[tone] || toastTones.info;
          const Icon = icon || toneStyle.icon;
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-toastIn items-center gap-3 rounded-xl border border-gray-200 bg-white py-3 pl-3 pr-2 shadow-lift"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneStyle.iconClass}`}>
                <Icon className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <p className="flex-1 text-sm font-medium text-gray-900">{message}</p>
              <button type="button" onClick={() => dismissToast(id)} className="icon-btn p-1.5" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
