import ModulePlaceholder from '../components/ModulePlaceholder'

export default function Operations() {
  return (
    <ModulePlaceholder
      title="Operations"
      summary="Day-to-day stock actions: goods receipts, issues, internal transfers and adjustments."
      planned={[
        'Record a goods receipt against a purchase',
        'Issue stock for orders or consumption',
        'Transfer stock between warehouses and bins',
        'Post cycle-count adjustments with a reason code',
      ]}
    />
  )
}
