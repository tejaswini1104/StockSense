import ModulePlaceholder from '../components/ModulePlaceholder'

export default function Warehouse() {
  return (
    <ModulePlaceholder
      title="Warehouse"
      summary="Physical locations, zones and storage bins that stock can be held in."
      planned={[
        'Manage warehouses and their addresses',
        'Define zones, racks and bins',
        'Assign a default warehouse per user',
        'View capacity and utilisation per location',
      ]}
    />
  )
}
