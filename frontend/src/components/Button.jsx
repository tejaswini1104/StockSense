export default function Button({
  children,
  variant = 'primary',
  loading = false,
  type = 'button',
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${className}`.trim()}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}
