import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useProducts } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteProduct } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import type { Product } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'

const ENTITY = 'product'

export function ProductsList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchName, setSearchName]   = useState('')
  const [searchCode, setSearchCode]   = useState('')
  const [searchMake, setSearchMake]   = useState('')
  const [searchDesc, setSearchDesc]   = useState('')
  const debouncedName = useDebounce(searchName, 350)
  const debouncedCode = useDebounce(searchCode, 350)
  const debouncedMake = useDebounce(searchMake, 350)
  const debouncedDesc = useDebounce(searchDesc, 350)

  const resetPage = () => setPage(1)
  const hasFilters = searchName || searchCode || searchMake || searchDesc
  const clearAll = () => {
    setSearchName(''); setSearchCode(''); setSearchMake(''); setSearchDesc(''); setPage(1)
  }

  const { data, isLoading, isError, error, refetch } = useProducts(page, pageSize, {
    nameContains:        debouncedName || undefined,
    itemCodeContains:    debouncedCode || undefined,
    makeContains:        debouncedMake || undefined,
    descriptionContains: debouncedDesc || undefined,
  })
  const deleteProduct = useDeleteProduct()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.products
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage = list?.lastPage ?? 1

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
    if (canShowColumn(readableFields, 'itemCode')) cols.push({ header: 'Item Code', cell: (r: Product) => r.itemCode ?? '—' })
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
    if (canShowColumn(readableFields, 'puUnitId')) cols.push({ header: 'PU Unit', cell: (r: Product) => r.puUnitName ?? r.puUnitId ?? '—' })
    if (canShowColumn(readableFields, 'stkUnitId')) cols.push({ header: 'Stock Unit', cell: (r: Product) => r.stkUnitName ?? r.stkUnitId ?? '—' })
    if (canShowColumn(readableFields, 'locationInStore')) cols.push({ header: 'Location', cell: (r: Product) => r.locationInStore ?? '—' })
    if (canShowColumn(readableFields, 'quantity')) cols.push({ header: 'Stock', cell: (r: Product) => r.quantity ?? '—' })
    if (canShowColumn(readableFields, 'unitPrice')) {
      cols.push({
        header: 'Unit Price',
        cell: (r: Product) => r.unitPrice != null ? r.unitPrice.toFixed(2) : '—',
      })
    }
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

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Item Code</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input
              value={searchCode}
              onChange={(e) => { setSearchCode(e.target.value); resetPage() }}
              placeholder="e.g. SRBOP001657"
              className="h-8 w-44 pl-6 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Name</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input
              value={searchName}
              onChange={(e) => { setSearchName(e.target.value); resetPage() }}
              placeholder="e.g. TRANSFORMER"
              className="h-8 w-48 pl-6 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Make</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input
              value={searchMake}
              onChange={(e) => { setSearchMake(e.target.value); resetPage() }}
              placeholder="e.g. Siemens"
              className="h-8 w-36 pl-6 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Description</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input
              value={searchDesc}
              onChange={(e) => { setSearchDesc(e.target.value); resetPage() }}
              placeholder="keyword…"
              className="h-8 w-44 pl-6 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded px-2 py-1.5 bg-white hover:border-red-300 transition-colors"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
          {isLoading && hasFilters && (
            <span className="text-xs text-slate-400 italic">Searching…</span>
          )}
        </div>
      </div>
    <MasterDataListPage<Product>
      title="Products"
      description="Manage products"
      createHref="/master/products/create"
      createLabel="Create Product"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      getEditHref={(r) => `/master/products/${r.id}/edit`}
      onDelete={handleDelete}
      deletePending={deleteProduct.isPending}
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
