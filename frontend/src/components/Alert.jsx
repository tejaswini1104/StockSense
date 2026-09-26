export default function Alert({ variant = 'error', children, onDismiss }) {
  if (!children) return null
  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="alert__text">{children}</span>
      {onDismiss && (
        <button type="button" className="alert__close" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  )
}
