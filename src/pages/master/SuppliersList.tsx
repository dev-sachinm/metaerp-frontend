import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useSuppliers } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteSupplier } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Supplier } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'supplier'

export function SuppliersList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useSuppliers(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteSup = useDeleteSupplier()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.suppliers
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: Supplier) => {
      if (confirm('Delete supplier "' + row.name + '"?')) {
        deleteSup.mutate(row.id)
      }
    },
    [deleteSup]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: Supplier) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: Supplier) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: Supplier) => r.name })
    if (canShowColumn(readableFields, 'contactPerson')) cols.push({ header: 'Contact Person', cell: (r: Supplier) => r.contactPerson ?? '—' })
    if (canShowColumn(readableFields, 'email')) cols.push({ header: 'Email', cell: (r: Supplier) => r.email ?? '—' })
    if (canShowColumn(readableFields, 'phone')) cols.push({ header: 'Phone', cell: (r: Supplier) => r.phone ?? '—' })
    if (canShowColumn(readableFields, 'address')) cols.push({ header: 'Address', cell: (r: Supplier) => r.address ?? '—' })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: Supplier) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: Supplier) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: Supplier) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: Supplier) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: Supplier) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: Supplier) =>
    `${r.code ?? ''} ${r.name ?? ''} ${r.contactPerson ?? ''} ${r.email ?? ''} ${r.phone ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<Supplier>
      title="Suppliers"
      description="Manage suppliers"
      createHref="/master/suppliers/create"
      createLabel="Create Supplier"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code, name, or contact…"
      getSearchText={getSearchText}
      getEditHref={(r) => '/master/suppliers/' + r.id + '/edit'}
      onDelete={handleDelete}
      deletePending={deleteSup.isPending}
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
