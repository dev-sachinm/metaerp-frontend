import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useProductCategories } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteProductCategory } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { ProductCategory } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20
const ENTITY = 'product_category'

export function ProductCategoriesList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useProductCategories(page * PAGE_SIZE, PAGE_SIZE, undefined)
  const deleteCat = useDeleteProductCategory()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.productCategories
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDelete = useCallback(
    (row: ProductCategory) => {
      if (confirm('Delete category "' + row.categoryName + '"?')) {
        deleteCat.mutate(row.id)
      }
    },
    [deleteCat]
  )

  const columns = useMemo(() => {
    const cols: { header: string; cell: (r: ProductCategory) => ReactNode }[] = []
    if (canShowColumn(readableFields, 'categoryName')) {
      cols.push({ header: 'Name', cell: (r: ProductCategory) => <span className="font-medium">{r.categoryName}</span> })
    }
    if (canShowColumn(readableFields, 'parentName') || canShowColumn(readableFields, 'parentId')) {
      cols.push({ header: 'Parent', cell: (r: ProductCategory) => r.parentName ?? '—' })
    }
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push({
        header: 'Status',
        cell: (r: ProductCategory) => (
          <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
        ),
      })
    }
    if (canShowColumn(readableFields, 'createdBy')) {
      cols.push({ header: 'Created By', cell: (r: ProductCategory) => r.createdByUsername ?? r.createdBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'modifiedBy')) {
      cols.push({ header: 'Modified By', cell: (r: ProductCategory) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    }
    if (canShowColumn(readableFields, 'createdAt')) {
      cols.push({
        header: 'Created At',
        cell: (r: ProductCategory) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'),
      })
    }
    if (canShowColumn(readableFields, 'modifiedAt')) {
      cols.push({
        header: 'Modified At',
        cell: (r: ProductCategory) => (r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—'),
      })
    }
    return cols
  }, [readableFields])

  const getSearchText = (r: ProductCategory) =>
    `${r.categoryName ?? ''} ${r.parentName ?? ''} ${r.parentId ?? ''}`.toLowerCase()

  return (
    <MasterDataListPage<ProductCategory>
      title="Product Categories"
      description="Manage product categories"
      createHref="/master/product-categories/create"
      createLabel="Create Category"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      enableSearch
      searchPlaceholder="Search by name or parent…"
      getSearchText={getSearchText}
      getEditHref={(r) => '/master/product-categories/' + r.id + '/edit'}
      onDelete={handleDelete}
      deletePending={deleteCat.isPending}
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
