export default function Toast({ toast }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && <div className="toast" key={toast.id}>{toast.message}</div>}
    </div>
  );
}
