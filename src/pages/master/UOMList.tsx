import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useUOMList } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteUOM } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { UOM } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'uom'

export function UOMList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useUOMList(page * PAGE_SIZE, PAGE_SIZE)
  const deleteUom = useDeleteUOM()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.uomList
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: UOM) => {
      if (confirm(`Delete UOM "${row.name}" (${row.code})?`)) {
        deleteUom.mutate(row.id)
      }
    },
    [deleteUom]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: UOM) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: UOM) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: UOM) => r.name })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: UOM) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: UOM) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: UOM) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: UOM) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: UOM) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: UOM) =>
    `${r.code ?? ''} ${r.name ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<UOM>
      title="Units of Measure"
      description="Manage UOM (units of measure)"
      createHref="/master/uom/create"
      createLabel="Create UOM"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code or name…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/uom/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteUom.isPending}
      page={page}
      pageSize={PAGE_SIZE}
      totalPages={totalPages}
      onPageChange={setPage}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
    />
  )
}
