import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { usePaymentTermsList } from '@/hooks/graphql/useMasterDataQueries'
import { useDeletePaymentTerm } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { PaymentTerm } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'payment_term'

export function PaymentTermsList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = usePaymentTermsList(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deletePt = useDeletePaymentTerm()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.paymentTermsList
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: PaymentTerm) => {
      if (confirm(`Delete payment term "${row.name}" (${row.code})?`)) {
        deletePt.mutate(row.id)
      }
    },
    [deletePt]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: PaymentTerm) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: PaymentTerm) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: PaymentTerm) => r.name })
    if (canShowColumn(readableFields, 'days')) cols.push({ header: 'Days', cell: (r: PaymentTerm) => r.days })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: PaymentTerm) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: PaymentTerm) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: PaymentTerm) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: PaymentTerm) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: PaymentTerm) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: PaymentTerm) =>
    `${r.code ?? ''} ${r.name ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<PaymentTerm>
      title="Payment Terms"
      description="Manage payment terms"
      createHref="/master/payment-terms/create"
      createLabel="Create Payment Term"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code or name…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/payment-terms/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deletePt.isPending}
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
