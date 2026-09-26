import Logo from './Logo'

export default function FullPageLoader({ message = 'Loading StockSense…' }) {
  return (
    <div className="page-loader">
      <Logo size={40} showWordmark={false} />
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
