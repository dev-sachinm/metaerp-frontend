import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useProductCategories } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteProductCategory } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { ProductCategory } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'

const ENTITY = 'product_category'

export function ProductCategoriesList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [f_nameContains, setF_nameContains] = useState('')
  const db_nameContains = useDebounce(f_nameContains, 350)

  const resetPage = () => setPage(1)
  const hasFilters = !!(  f_nameContains)
  const clearAll = () => { setF_nameContains(''); setPage(1) }

  const { data, isLoading, isError, error, refetch } = useProductCategories(page, pageSize, {
    nameContains: db_nameContains || undefined,
  })
  const deleteCat = useDeleteProductCategory()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.productCategories
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage = list?.lastPage ?? 1

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
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Name</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_nameContains} onChange={(e) => { setF_nameContains(e.target.value); resetPage() }}
              placeholder="e.g. Electronics" className="h-8 w-56 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          {hasFilters && (
            <button type="button" onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded px-2 py-1.5 bg-white hover:border-red-300 transition-colors">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
          {isLoading && hasFilters && <span className="text-xs text-slate-400 italic">Searching…</span>}
        </div>
      </div>
    <MasterDataListPage<ProductCategory>
      title="Product Categories"
      description="Manage product categories"
      createHref="/master/product-categories/create"
      createLabel="Create Category"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      getSearchText={getSearchText}
      getEditHref={(r) => '/master/product-categories/' + r.id + '/edit'}
      onDelete={handleDelete}
      deletePending={deleteCat.isPending}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      hasMore={hasMore}
      firstPage={firstPage}
      lastPage={lastPage}
      onPageChange={setPage}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
    />
    </>
  )
}
