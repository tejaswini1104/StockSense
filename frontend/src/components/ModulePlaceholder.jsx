import { Link } from 'react-router-dom'

/**
 * Placeholder for a module whose backend endpoints do not exist yet.
 * It deliberately shows no invented figures or rows - only what is planned -
 * so nothing on screen can be mistaken for real inventory data.
 */
export default function ModulePlaceholder({ title, summary, planned = [] }) {
  return (
    <section className="placeholder">
      <div className="placeholder__icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7.5 12 3.5l8 4-8 4-8-4Zm0 0v9l8 4 8-4v-9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2>{title}</h2>
      <p className="placeholder__summary">{summary}</p>

      {planned.length > 0 && (
        <>
          <p className="placeholder__label">Planned for this module</p>
          <ul className="placeholder__list">
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <p className="placeholder__note">
        This screen is a navigation placeholder. It will render live data once the
        module&apos;s API endpoints are built - no sample data is shown here on purpose.
      </p>

      <Link className="btn btn--ghost" to="/dashboard">
        Back to dashboard
      </Link>
    </section>
  )
}
