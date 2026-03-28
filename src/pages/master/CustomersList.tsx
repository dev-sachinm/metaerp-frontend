import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { MasterDataListPage } from './MasterDataListPage'
import { useCustomers } from '@/hooks/graphql/useMasterDataQueries'
import { useDeleteCustomer } from '@/hooks/graphql/useMasterDataMutations'
import { useAccessibleFields, canShowColumn, useEntityActions } from '@/hooks/usePermissions'
import { getEntityConfig } from '@/registry/entityFields'
import type { Customer } from '@/types/masterData'
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'

const ENTITY = 'customer'

export function CustomersList() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [f_nameContains, setF_nameContains] = useState('')
  const [f_codeContains, setF_codeContains] = useState('')
  const [f_contactNameContains, setF_contactNameContains] = useState('')
  const [f_emailContains, setF_emailContains] = useState('')
  const db_nameContains = useDebounce(f_nameContains, 350)
  const db_codeContains = useDebounce(f_codeContains, 350)
  const db_contactNameContains = useDebounce(f_contactNameContains, 350)
  const db_emailContains = useDebounce(f_emailContains, 350)

  const resetPage = () => setPage(1)
  const hasFilters = !!(  f_nameContains || f_codeContains || f_contactNameContains || f_emailContains)
  const clearAll = () => { setF_nameContains('');  setF_codeContains('');  setF_contactNameContains('');  setF_emailContains(''); setPage(1) }

  const { data, isLoading, isError, error, refetch } = useCustomers(page, pageSize, {
    nameContains: db_nameContains || undefined,
    codeContains: db_codeContains || undefined,
    contactNameContains: db_contactNameContains || undefined,
    emailContains: db_emailContains || undefined,
  })
  const deleteCustomer = useDeleteCustomer()
  const readableFields = useAccessibleFields(ENTITY, 'read')
  const { canRead, canUpdate, canDelete } = useEntityActions(ENTITY)
  const config = getEntityConfig(ENTITY)

  const list = data?.customers
  const items = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage = list?.lastPage ?? 1

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
    if (canShowColumn(readableFields, 'code'))
      cols.push({ header: 'Code', cell: (r) => <span className="font-mono font-medium text-slate-800">{r.code}</span> })
    if (canShowColumn(readableFields, 'name'))
      cols.push({ header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> })
    if (canShowColumn(readableFields, 'address'))
      cols.push({
        header: 'Address',
        cell: (r) => r.address
          ? <span className="text-slate-600 line-clamp-1" title={r.address}>{r.address}</span>
          : <span className="text-slate-300">—</span>,
      })
    if (canShowColumn(readableFields, 'primaryContactName'))
      cols.push({ header: 'Contact Name', cell: (r) => r.primaryContactName ?? '—' })
    if (canShowColumn(readableFields, 'primaryContactEmail'))
      cols.push({ header: 'Contact Email', cell: (r) => r.primaryContactEmail
        ? <a href={`mailto:${r.primaryContactEmail}`} className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>{r.primaryContactEmail}</a>
        : '—' })
    if (canShowColumn(readableFields, 'primaryContactMobile'))
      cols.push({ header: 'Contact Mobile', cell: (r) => r.primaryContactMobile ?? '—' })
    if (canShowColumn(readableFields, 'isActive'))
      cols.push({
        header: 'Active',
        cell: (r) => <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
      })
    if (canShowColumn(readableFields, 'createdBy'))
      cols.push({ header: 'Created By', cell: (r) => r.createdByUsername ?? r.createdBy ?? '—' })
    if (canShowColumn(readableFields, 'modifiedBy'))
      cols.push({ header: 'Modified By', cell: (r) => r.modifiedByUsername ?? r.modifiedBy ?? '—' })
    if (canShowColumn(readableFields, 'createdAt'))
      cols.push({ header: 'Created At', cell: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—' })
    if (canShowColumn(readableFields, 'modifiedAt'))
      cols.push({ header: 'Modified At', cell: (r) => r.modifiedAt ? new Date(r.modifiedAt).toLocaleString() : '—' })
    return cols
  }, [readableFields])

  const getSearchText = (r: Customer) =>
    `${r.code ?? ''} ${r.name ?? ''} ${r.primaryContactName ?? ''} ${r.primaryContactEmail ?? ''}`.toLowerCase()

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 mb-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Name</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_nameContains} onChange={(e) => { setF_nameContains(e.target.value); resetPage() }}
              placeholder="e.g. Acme Corp" className="h-8 w-48 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Code</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_codeContains} onChange={(e) => { setF_codeContains(e.target.value); resetPage() }}
              placeholder="e.g. ACME001" className="h-8 w-36 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Contact</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_contactNameContains} onChange={(e) => { setF_contactNameContains(e.target.value); resetPage() }}
              placeholder="e.g. John" className="h-8 w-36 pl-6 text-xs" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Email</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <Input value={f_emailContains} onChange={(e) => { setF_emailContains(e.target.value); resetPage() }}
              placeholder="e.g. @acme.com" className="h-8 w-44 pl-6 text-xs" />
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
    <MasterDataListPage<Customer>
      title={config?.listTitle ?? 'Customers'}
      description={config?.description}
      createHref="/master/customers/create"
      createLabel={config?.createTitle ?? 'Create Customer'}
      isLoading={isLoading}
      total={total}
      items={items}
      columns={columns}
      getSearchText={getSearchText}
      getViewHref={canRead ? (r) => `/master/customers/${r.id}/view` : undefined}
      getEditHref={canUpdate ? (r) => `/master/customers/${r.id}/edit` : undefined}
      onDelete={canDelete ? handleDelete : undefined}
      deletePending={deleteCustomer.isPending}
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
