import type { ToastData } from '../hooks/useToast';

export function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="fb"
          onClick={() => {
            toast.action?.run();
            onClose();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
