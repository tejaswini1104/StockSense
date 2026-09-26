import { useEffect, useRef } from 'react'

const LENGTH = 6

/** Six single-character boxes that behave like one input. */
export default function OtpInput({ value, onChange, disabled = false, autoFocus = true }) {
  const inputs = useRef([])
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus()
  }, [autoFocus])

  const setDigit = (index, digit) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('')
    onChange(next.replace(/ /g, '').slice(0, LENGTH))
  }

  const handleChange = (index) => (event) => {
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) {
      setDigit(index, ' ')
      return
    }
    // Support pasting or fast typing of several digits at once.
    if (typed.length > 1) {
      const merged = (value.slice(0, index) + typed).replace(/\D/g, '').slice(0, LENGTH)
      onChange(merged)
      inputs.current[Math.min(merged.length, LENGTH - 1)]?.focus()
      return
    }
    setDigit(index, typed)
    if (index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index) => (event) => {
    if (event.key === 'Backspace' && !digits[index].trim() && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
      setDigit(index - 1, ' ')
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  return (
    <div className="otp" role="group" aria-label="One-time password">
      {digits.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(node) => {
            inputs.current[index] = node
          }}
          className="otp__box"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={LENGTH}
          value={digit.trim()}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
