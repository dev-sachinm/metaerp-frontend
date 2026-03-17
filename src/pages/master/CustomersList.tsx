import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useCustomers } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteCustomer } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn, useEntityActions } from '@/hooks/usePermissions'
import { getEntityConfig } from '@/registry/entityFields'
import type { Customer } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'customer'

export function CustomersList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useCustomers(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteCustomer = useDeleteCustomer()
  const readableFields = useAccessibleFields(ENTITY, 'read')
  const { canRead, canUpdate, canDelete } = useEntityActions(ENTITY)
  const config = getEntityConfig(ENTITY)

  const list = data?.customers
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: Customer) => {
      if (confirm(`Delete customer "${row.name}"?`)) {
        deleteCustomer.mutate(row.id)
      }
    },
    [deleteCustomer]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: Customer) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code'))
      cols.push({ header: 'Code', cell: (r) => <span className="font-mono font-medium text-slate-800">{r.code}</span> })
    if (canShowColumn(readableFields, 'name'))
      cols.push({ header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> })
    if (canShowColumn(readableFields, 'address'))
      cols.push({
        header: 'Address',
        cell: (r) => r.address
          ? <span className="text-slate-600 line-clamp-1" title={r.address}>{r.address}</span>
          : <span className="text-slate-300">—</span>,
      })
    if (canShowColumn(readableFields, 'primaryContactName'))
      cols.push({ header: 'Contact Name', cell: (r) => r.primaryContactName ?? '—' })
    if (canShowColumn(readableFields, 'primaryContactEmail'))
      cols.push({ header: 'Contact Email', cell: (r) => r.primaryContactEmail
        ? <a href={`mailto:${r.primaryContactEmail}`} className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r.primaryContactEmail}</a>
        : '—' })
    if (canShowColumn(readableFields, 'primaryContactMobile'))
      cols.push({ header: 'Contact Mobile', cell: (r) => r.primaryContactMobile ?? '—' })
    if (canShowColumn(readableFields, 'isActive'))
      cols.push({
        header: 'Active',
        cell: (r) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
      })
    if (canShowColumn(readableFields, 'createdBy'))
      cols.push({ header: 'Created By', cell: (r) => r.createdByUsername ?? r.createdBy ?? '—' })
    if (canShowColumn(readableFields, 'modifiedBy'))
      cols.push({ header: 'Modified By', cell: (r) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    if (canShowColumn(readableFields, 'createdAt'))
      cols.push({ header: 'Created At', cell: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—' })
    if (canShowColumn(readableFields, 'modifiedAt'))
      cols.push({ header: 'Modified At', cell: (r) => r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—' })
    return cols
  }, [readableFields])

  const getSearchText = (r: Customer) =>
    `${r.code ?? ''} ${r.name ?? ''} ${r.primaryContactName ?? ''} ${r.primaryContactEmail ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<Customer>
      title={config?.listTitle ?? 'Customers'}
      description={config?.description}
      createHref="/master/customers/create"
      createLabel={config?.createTitle ?? 'Create Customer'}
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code, name, or contact…"
      getSearchText={getSearchText}
      getViewHref={canRead ? (r) => `/master/customers/${r.id}/view` : undefined}
      getEditHref={canUpdate ? (r) => `/master/customers/${r.id}/edit` : undefined}
      onDelete={canDelete ? handleDelete : undefined}
      deletePending={deleteCustomer.isPending}
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
