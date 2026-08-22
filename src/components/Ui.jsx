export function Spinner({ small = false }) {
  return <span className={`spinner ${small ? 'spinner-small' : ''}`} aria-label="Loading" />;
}

export function StatusPill({ tone = 'neutral', children }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <section className={`glass modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div><span className="eyebrow">Graduation Control</span><h2>{title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <button className={`toast toast-${toast.tone || 'info'}`} onClick={onClose}>
      <span>{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}</span>
      <div><strong>{toast.title}</strong>{toast.message && <small>{toast.message}</small>}</div>
    </button>
  );
}

export function ConfigNotice() {
  return (
    <div className="config-notice glass">
      <strong>Firebase setup required</strong>
      <p>Copy <code>.env.example</code> to <code>.env</code>, add the Firebase web configuration and restart the dev server.</p>
    </div>
  );
}
