import { useId, useState } from 'react'

export default function Field({
  label,
  type = 'text',
  hint,
  error,
  showPasswordToggle = false,
  ...rest
}) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && revealed ? 'text' : type

  return (
    <div className={`field ${error ? 'field--invalid' : ''}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type={inputType}
          className="field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${id}-help` : undefined}
          {...rest}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            className="field__reveal"
            onClick={() => setRevealed((value) => !value)}
            tabIndex={-1}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? 'field__error' : 'field__hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
