import ModulePlaceholder from '../components/ModulePlaceholder'

export default function Products() {
  return (
    <ModulePlaceholder
      title="Products"
      summary="The catalogue of every item you stock, with SKUs, units of measure and reorder levels."
      planned={[
        'Create, edit and archive products',
        'SKU, barcode, category and unit of measure',
        'Reorder level and preferred supplier',
        'Search and filter across the catalogue',
      ]}
    />
  )
}
