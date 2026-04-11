import { ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { PlusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react'
import { isPermissionError, getErrorMessage } from '@/lib/graphqlErrors'
import { Input } from '@/components/ui/input'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

interface MasterDataListPageProps<T> {
  title: string
  description?: string
  createHref?: string
  createLabel?: string
  isLoading: boolean
  total: number
  items: T[]
  columns: { header: string; cell: (row: T) => ReactNode }[]
  getViewHref?: (row: T) => string
  getEditHref?: (row: T) => string
  onRowClick?: (row: T) => void
  onDelete?: (row: T) => void
  deletePending?: boolean
  page: number
  pageSize: number
  totalPages: number
  hasMore?: boolean
  firstPage?: number
  lastPage?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isError?: boolean
  error?: unknown
  onRetry?: () => void
  enableSearch?: boolean
  searchPlaceholder?: string
  getSearchText?: (row: T) => string
}

export function MasterDataListPage<T extends { id: string }>({
  title, description, createHref, createLabel = 'Create',
  isLoading, total, items, columns,
  getViewHref, getEditHref, onRowClick, onDelete, deletePending,
  page, pageSize, totalPages, hasMore, firstPage = 1, lastPage,
  onPageChange, onPageSizeChange,
  isError, error, onRetry,
  enableSearch, searchPlaceholder, getSearchText,
}: MasterDataListPageProps<T>) {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()

  const filteredItems = useMemo(() => {
    if (!enableSearch || !normalizedSearch || !getSearchText) return items
    return items.filter((row) => {
      try { return getSearchText(row).toLowerCase().includes(normalizedSearch) }
      catch { return false }
    })
  }, [items, enableSearch, normalizedSearch, getSearchText])

  const effectiveTotal = enableSearch && normalizedSearch ? filteredItems.length : total
  const resolvedLastPage = lastPage ?? totalPages
  const showPagination = !normalizedSearch && totalPages > 1
  const hasActions = getViewHref || getEditHref || onDelete
  const queryFailed = Boolean(isError && error)
  const permissionDenied = queryFailed && isPermissionError(error)

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const paginationBar = showPagination ? (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-slate-200">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>{from}–{to} of {total}</span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded border border-slate-200 bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-slate-400">per page</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(firstPage)}
          disabled={page <= firstPage} title="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)}
          disabled={page <= firstPage} title="Previous page">
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        <span className="px-3 text-sm text-slate-600 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)}
          disabled={!hasMore && page >= resolvedLastPage} title="Next page">
          Next<ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(resolvedLastPage)}
          disabled={page >= resolvedLastPage} title="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 truncate">{title}</h2>
          {description && <p className="text-slate-600 text-sm mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {enableSearch && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search...'}
              className="h-8 w-40 sm:w-56 md:w-64"
            />
          )}
          {createHref && (
            <Button asChild size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Link to={createHref}>
                <PlusCircle className="h-4 w-4" />
                {createLabel}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title} ({effectiveTotal})</CardTitle>
          <CardDescription>
            {effectiveTotal === 0 ? 'No records yet.'
              : enableSearch && normalizedSearch
                ? `${filteredItems.length} result${filteredItems.length !== 1 ? 's' : ''} matching "${search}"`
                : `Showing ${from}–${to} of ${total} record${total !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader /></div>
          ) : permissionDenied ? (
            <OperationNotPermitted context={`You do not have permission to view ${title}.`} />
          ) : queryFailed ? (
            <div className="text-center py-12 text-amber-800">
              <p className="font-medium">{getErrorMessage(error, `Failed to load ${title.toLowerCase()}`)}</p>
              {onRetry && <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">Try again</Button>}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">No records found</p>
              {createHref && !normalizedSearch && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to={createHref}>{createLabel}</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {paginationBar}
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col, i) => <TableHead key={i}>{col.header}</TableHead>)}
                    {hasActions && <TableHead className="w-[120px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((row) => (
                    <TableRow
                      key={row.id}
                      className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col, i) => <TableCell key={i}>{col.cell(row)}</TableCell>)}
                      {hasActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {getViewHref && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={getViewHref(row)}><Eye className="h-3.5 w-3.5 mr-1" />View</Link>
                              </Button>
                            )}
                            {getEditHref && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={getEditHref(row)}>Edit</Link>
                              </Button>
                            )}
                            {onDelete && (
                              <Button variant="ghost" size="sm"
                                className="text-red-600 hover:text-red-700"
                                disabled={deletePending}
                                onClick={() => onDelete(row)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-2">{paginationBar}</div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
