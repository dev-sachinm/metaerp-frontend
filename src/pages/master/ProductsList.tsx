import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useProducts } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteProduct } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Product } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'product'

export function ProductsList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useProducts(page * PAGE_SIZE, PAGE_SIZE, null, undefined)
  const deleteProduct = useDeleteProduct()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.products
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: Product) => {
      if (confirm(`Delete product "${row.name}"?`)) {
        deleteProduct.mutate(row.id)
      }
    },
    [deleteProduct]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: Product) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'name')) cols.push({ header: 'Name', cell: (r: Product) => <span className="font-medium">{r.name}</span> })
    if (canShowColumn(readableFields, 'partNo')) cols.push({ header: 'Part No', cell: (r: Product) => r.partNo ?? '—' })
    if (canShowColumn(readableFields, 'categoryId') || canShowColumn(readableFields, 'categoryName')) {
      cols.push({
        header: 'Category',
        cell: (r: Product) => (r as any).categoryName ?? r.categoryId ?? '—',
      })
    }
    if (canShowColumn(readableFields, 'description')) {
      cols.push({
        header: 'Description',
        cell: (r: Product) => (r.description ? r.description.slice(0, 40) + (r.description.length > 40 ? '…' : '') : '—'),
      })
    }
    if (canShowColumn(readableFields, 'make')) cols.push({ header: 'Make', cell: (r: Product) => r.make ?? '—' })
    if (canShowColumn(readableFields, 'unitId')) cols.push({ header: 'Unit', cell: (r: Product) => r.unitName ?? r.unitId ?? '—' })
    if (canShowColumn(readableFields, 'quantity')) cols.push({ header: 'Stock', cell: (r: Product) => r.quantity ?? '—' })
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: Product) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: Product) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: Product) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({ header: 'Created At', cell: (r: Product) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({ header: 'Modified At', cell: (r: Product) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—') })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: Product) =>
    `${r.name ?? ''} ${r.partNo ?? ''} ${r.categoryId ?? ''} ${r.make ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<Product>
      title="Products"
      description="Manage products"
      createHref="/master/products/create"
      createLabel="Create Product"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by name, part no, category…"
      getSearchText={getSearchText}
      getEditHref={(r) => `/master/products/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteProduct.isPending}
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
