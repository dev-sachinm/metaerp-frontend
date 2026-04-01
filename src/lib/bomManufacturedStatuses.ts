/**
 * Manufactured BOM line status values (backend snake_case strings).
 * Adjust to match your API if mutations reject a value.
 */
export const MANUFACTURED_PART_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'inprogress', label: 'Inprogress' },
  { value: 'quality_checked', label: 'Quality Checked' },
  { value: 'received', label: 'Received' },
]

export function formatManufacturedStatus(status: string | null | undefined): string {
  if (!status) return '—'
  const opt = MANUFACTURED_PART_STATUS_OPTIONS.find((o) => o.value === status)
  return opt?.label ?? status.replace(/_/g, ' ')
}
