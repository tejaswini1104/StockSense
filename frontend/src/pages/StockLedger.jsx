import ModulePlaceholder from '../components/ModulePlaceholder'

export default function StockLedger() {
  return (
    <ModulePlaceholder
      title="Stock Ledger"
      summary="The running balance of each product per location, derived from posted movements."
      planned={[
        'Opening balance, movements in/out and closing balance',
        'Balance per product per warehouse',
        'Drill down from a balance to its source movements',
        'As-of-date ledger snapshots',
      ]}
    />
  )
}
