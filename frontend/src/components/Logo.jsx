import { useId } from 'react'

export default function Logo({ size = 32, showWordmark = true, tone = 'dark' }) {
  // The gradient id must be unique per instance: two <Logo>s on one page would
  // otherwise share an id, and the first definition wins - which breaks the
  // fill when that first instance sits inside a hidden subtree.
  const gradientId = `ss-logo-${useId().replace(/:/g, '')}`

  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="StockSense">
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        <path
          d="M9 20.5V13l7-4 7 4v7.5l-7 4-7-4Z"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 13l7 4 7-4M16 17v7.5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#4f46e5" />
            <stop offset="1" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && (
        <span className={`logo-word logo-word--${tone}`}>
          Stock<strong>Sense</strong>
        </span>
      )}
    </span>
  )
}
