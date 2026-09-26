import ModulePlaceholder from '../components/ModulePlaceholder'

export default function MoveHistory() {
  return (
    <ModulePlaceholder
      title="Move History"
      summary="A chronological record of every completed stock movement, and who performed it."
      planned={[
        'Filter movements by product, location, type and date',
        'See source and destination for each transfer',
        'Attribute every movement to a user',
        'Export a filtered movement report',
      ]}
    />
  )
}
