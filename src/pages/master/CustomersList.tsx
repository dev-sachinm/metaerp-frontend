import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useCustomers } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteCustomer } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Customer } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20

/** Entity name for field-level permissions (must match backend entity_permissions.entity_name) */
const CUSTOMER_ENTITY = 'customer'

export function CustomersList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useCustomers(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteCustomer = useDeleteCustomer()
  const readableFields = useAccessibleFields(CUSTOMER_ENTITY, 'read')

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
    if (canShowColumn(readableFields, 'code')) {
      cols.push({ header: 'Code', cell: (r: Customer) => <span className="font-medium">{r.code}</span> })
    }
    if (canShowColumn(readableFields, 'name')) {
      cols.push({ header: 'Name', cell: (r: Customer) => r.name })
    }
    if (canShowColumn(readableFields, 'address')) {
      cols.push({ header: 'Address', cell: (r: Customer) => r.address ?? '—' })
    }
    if (canShowColumn(readableFields, 'contactInfo')) {
      cols.push({ header: 'Contact', cell: (r: Customer) => r.contactInfo ?? '—' })
    }
    if (canShowColumn(readableFields, 'primaryContactName')) {
      cols.push({ header: 'Primary contact', cell: (r: Customer) => r.primaryContactName ?? '—' })
    }
    if (canShowColumn(readableFields, 'primaryContactEmail')) {
      cols.push({ header: 'Primary email', cell: (r: Customer) => r.primaryContactEmail ?? '—' })
    }
    if (canShowColumn(readableFields, 'primaryContactMobile')) {
      cols.push({ header: 'Primary mobile', cell: (r: Customer) => r.primaryContactMobile ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({
        header: 'Created At',
        cell: (r: Customer) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'),
      })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({
        header: 'Modified At',
        cell: (r: Customer) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—'),
      })
    }
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: Customer) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    return cols
  }, [readableFields])

  return (
    <MasterDataListPage<Customer>
      title="Customers"
      description="Manage customer records"
      createHref="/master/customers/create"
      createLabel="Create Customer"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      getEditHref={(r) => `/master/customers/${r.id}/edit`}
      onDelete={handleDelete}
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
