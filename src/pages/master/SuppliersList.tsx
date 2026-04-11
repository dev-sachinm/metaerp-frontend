import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useSuppliers } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteSupplier } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Supplier } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'

const ENTITY = 'supplier'

export function SuppliersList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [f_nameContains, setF_nameContains] = useState('')
  const [f_codeContains, setF_codeContains] = useState('')
  const [f_contactPersonContains, setF_contactPersonContains] = useState('')
  const [f_emailContains, setF_emailContains] = useState('')
  const db_nameContains = useDebounce(f_nameContains, 350)
  const db_codeContains = useDebounce(f_codeContains, 350)
  const db_contactPersonContains = useDebounce(f_contactPersonContains, 350)
  const db_emailContains = useDebounce(f_emailContains, 350)

  const resetPage = () => setPage(1)
  const hasFilters = !!(  f_nameContains || f_codeContains || f_contactPersonContains || f_emailContains)
  const clearAll = () => { setF_nameContains('');  setF_codeContains('');  setF_contactPersonContains('');  setF_emailContains(''); setPage(1) }

  const { data, isLoading, isError, error, refetch } = useSuppliers(page, pageSize, {
    nameContains: db_nameContains || undefined,
    codeContains: db_codeContains || undefined,
    contactPersonContains: db_contactPersonContains || undefined,
    emailContains: db_emailContains || undefined,
  })
  const deleteSup = useDeleteSupplier()
  const readableFields = useAccessibleFields(ENTITY, 'read')

  const list = data?.suppliers
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage = list?.lastPage ?? 1

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
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Name</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_nameContains} onChange={(e) => { setF_nameContains(e.target.value); resetPage() }}
              placeholder="Search name…" className="h-8 w-48 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Code</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_codeContains} onChange={(e) => { setF_codeContains(e.target.value); resetPage() }}
              placeholder="Search code…" className="h-8 w-36 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Contact</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_contactPersonContains} onChange={(e) => { setF_contactPersonContains(e.target.value); resetPage() }}
              placeholder="Contact name…" className="h-8 w-36 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Email</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_emailContains} onChange={(e) => { setF_emailContains(e.target.value); resetPage() }}
              placeholder="@domain.com" className="h-8 w-44 pl-6 text-xs" />
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
    <MasterDataListPage<Supplier>
      title="Suppliers"
      description="Manage suppliers"
      createHref="/master/suppliers/create"
      createLabel="Create Supplier"
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      getSearchText={getSearchText}
      getEditHref={(r) => '/master/suppliers/' + r.id + '/edit'}
      onDelete={handleDelete}
      deletePending={deleteSup.isPending}
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
