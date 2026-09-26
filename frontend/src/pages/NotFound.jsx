import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="placeholder">
      <h2>Page not found</h2>
      <p className="placeholder__summary">
        The page you are looking for does not exist or has moved.
      </p>
      <Link className="btn btn--primary" to="/dashboard">
        Go to dashboard
      </Link>
    </section>
  )
}
