import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { isPermissionError, getErrorMessage } from '@/lib/graphqlErrors'

interface MasterDataListPageProps<T> {
  title: string
  description?: string
  createHref?: string
  createLabel?: string
  isLoading: boolean
  total: number
  items: T[]
  columns: { header: string; cell: (row: T) => ReactNode }[]
  getEditHref?: (row: T) => string
  onDelete?: (row: T) => void
  deletePending?: boolean
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  /** When the list query failed, show permission or generic error instead of "No records found" */
  isError?: boolean
  error?: unknown
  /** Optional refetch (e.g. from useQuery) for "Try again" on generic error */
  onRetry?: () => void
}

export function MasterDataListPage<T extends { id: string }>({
  title,
  description,
  createHref,
  createLabel = 'Create',
  isLoading,
  total,
  items,
  columns,
  getEditHref,
  onDelete,
  deletePending,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isError,
  error,
  onRetry,
}: MasterDataListPageProps<T>) {
  const start = page * pageSize
  const end = Math.min(start + pageSize, items.length)
  const showPagination = totalPages > 1
  const hasActions = getEditHref || onDelete
  const queryFailed = Boolean(isError && error)
  const permissionDenied = queryFailed && isPermissionError(error)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-slate-600 text-sm mt-0.5">{description}</p>}
        </div>
        {createHref && (
          <Button asChild size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Link to={createHref}>
              <PlusCircle className="h-4 w-4" />
              {createLabel}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title} ({total})</CardTitle>
          <CardDescription>
            {total === 0 ? 'No records yet.' : `Showing ${start + 1}-${end} of ${total}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : permissionDenied ? (
            <OperationNotPermitted context={`You do not have permission to view ${title}.`} />
          ) : queryFailed ? (
            <div className="text-center py-12 text-amber-800">
              <p className="font-medium">{getErrorMessage(error, `Failed to load ${title.toLowerCase()}`)}</p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
                  Try again
                </Button>
              )}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="font-medium">No records found</p>
              {createHref && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to={createHref}>{createLabel}</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col, i) => (
                      <TableHead key={i}>{col.header}</TableHead>
                    ))}
                    {hasActions && <TableHead className="w-[120px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((col, i) => (
                        <TableCell key={i}>{col.cell(row)}</TableCell>
                      ))}
                      {hasActions && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEditHref && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={getEditHref(row)}>Edit</Link>
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                disabled={deletePending}
                                onClick={() => onDelete(row)}
                              >
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
              {showPagination && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <span className="text-sm text-slate-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page - 1)}
                      disabled={page <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
