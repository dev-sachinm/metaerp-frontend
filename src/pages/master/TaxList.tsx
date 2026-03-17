import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useTaxList } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteTax } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Tax } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'tax'

export function TaxList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useTaxList(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteTax = useDeleteTax()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.taxList
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: Tax) => {
      if (confirm(`Delete tax "${row.name}" (${row.code})?`)) {
        deleteTax.mutate(row.id)
      }
    },
    [deleteTax]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: Tax) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: Tax) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: Tax) => r.name })
    if (canShowColumn(readableFields, 'ratePercent')) cols.push({ header: 'Rate %', cell: (r: Tax) => r.ratePercent })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: Tax) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: Tax) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: Tax) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: Tax) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: Tax) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: Tax) =>
    `${r.code ?? ''} ${r.name ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<Tax>
      title="Tax"
      description="Manage tax codes and rates"
      createHref="/master/tax/create"
      createLabel="Create Tax"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code or name…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/tax/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteTax.isPending}
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
