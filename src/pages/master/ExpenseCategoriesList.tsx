import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useExpenseCategoriesList } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteExpenseCategory } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { ExpenseCategory } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'expense_category'

export function ExpenseCategoriesList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useExpenseCategoriesList(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteEc = useDeleteExpenseCategory()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.expenseCategoriesList
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: ExpenseCategory) => {
      if (confirm(`Delete expense category "${row.name}" (${row.code})?`)) {
        deleteEc.mutate(row.id)
      }
    },
    [deleteEc]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: ExpenseCategory) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'code')) cols.push({ header: 'Code', cell: (r: ExpenseCategory) => <span className="font-medium">{r.code}</span> })
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: ExpenseCategory) => r.name })
    if (canShowColumn(readableFields, 'parentName') || canShowColumn(readableFields, 'parentId')) {
      cols.push({ header: 'Parent', cell: (r: ExpenseCategory) => r.parentName ?? r.parentId ?? '—' })
    }
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: ExpenseCategory) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: ExpenseCategory) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: ExpenseCategory) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: ExpenseCategory) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: ExpenseCategory) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: ExpenseCategory) =>
    `${r.code ?? ''} ${r.name ?? ''} ${r.parentName ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<ExpenseCategory>
      title="Expense Categories"
      description="Manage expense categories"
      createHref="/master/expense-categories/create"
      createLabel="Create Expense Category"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by code, name, or parent…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/expense-categories/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteEc.isPending}
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
