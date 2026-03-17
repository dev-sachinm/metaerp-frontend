import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useVendors } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteVendor } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Vendor } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'vendor'

export function VendorsList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useVendors(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteVendor = useDeleteVendor()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.vendors
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: Vendor) => {
      if (confirm(`Delete vendor "${row.name}"?`)) {
        deleteVendor.mutate(row.id)
      }
    },
    [deleteVendor]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: Vendor) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: Vendor) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: Vendor) => r.name })
    if (canShowColumn(readableFields, 'contactPerson')) cols.push({ header: 'Contact Person', cell: (r: Vendor) => r.contactPerson ?? '—' })
    if (canShowColumn(readableFields, 'email')) cols.push({ header: 'Email', cell: (r: Vendor) => r.email ?? '—' })
    if (canShowColumn(readableFields, 'phone')) cols.push({ header: 'Phone', cell: (r: Vendor) => r.phone ?? '—' })
    if (canShowColumn(readableFields, 'address')) cols.push({ header: 'Address', cell: (r: Vendor) => r.address ?? '—' })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: Vendor) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: Vendor) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: Vendor) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: Vendor) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: Vendor) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: Vendor) =>
    `${r.code ?? ''} ${r.name ?? ''} ${r.contactPerson ?? ''} ${r.email ?? ''} ${r.phone ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<Vendor>
      title="Vendors"
      description="Manage vendors"
      createHref="/master/vendors/create"
      createLabel="Create Vendor"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code, name, or contact…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/vendors/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteVendor.isPending}
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
