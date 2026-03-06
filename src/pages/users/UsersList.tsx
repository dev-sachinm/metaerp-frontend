import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useEntityActions, useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Loader } from '@/components/Loader'
import { useInfiniteUsers, useDeleteUser, type User } from '@/hooks/graphql/useUsersQuery'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import {
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'

const columnHelper = createColumnHelper<User>()

export function UsersList() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const batchSize = Number(import.meta.env.VITE_GRAPHQL_BATCH_SIZE) || 1000
  const pageSize = Number(import.meta.env.VITE_TABLE_PAGE_SIZE) || 50

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteUsers(batchSize)

  const { canUpdate, canDelete } = useEntityActions('user')
  const deleteUser = useDeleteUser()
  const readableFields = useAccessibleFields('user', 'read')

  const allUsers = useMemo(
    () => data?.pages.flatMap((page) => page.users.items) ?? [],
    [data]
  )

  const handleManageAccess = useCallback((userId: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to manage user access.')
      return
    }
    navigate(`/users/${userId}/access`)
  }, [canUpdate, navigate])
  const handleEditUser = useCallback((userId: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit users.')
      return
    }
    navigate(`/users/${userId}/edit`)
  }, [canUpdate, navigate])
  const handleChangePassword = useCallback((userId: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to change user password.')
      return
    }
    navigate(`/users/${userId}/change-password`)
  }, [canUpdate, navigate])
  const handleDeleteUser = useCallback((user: User) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete users.')
      return
    }
    const label = user.email || user.username || 'this user'
    if (confirm(`Are you sure you want to delete ${label}?`)) {
      deleteUser.mutate(user.id, {
        onSuccess: (data) => {
          if (data.deleteUser) {
            toast.success('User deleted successfully')
          } else {
            toast.error('User not found or could not be deleted')
          }
        },
        onError: (err: Error) => {
          if (!isPermissionError(err)) toast.error(getErrorMessage(err, 'Failed to delete user'))
        },
      })
    }
  }, [canDelete, deleteUser])

  const columns = useMemo(() => {
    const cols = []

    // Show columns only based on useAccessibleFields('user', 'read'). Backend controls which fields are readable.
    // Do not show id/UUID in the UI — not user-friendly.

    if (canShowColumn(readableFields, 'firstName') || canShowColumn(readableFields, 'lastName')) {
      cols.push(
        columnHelper.display({
          id: 'name',
          header: 'Name',
          cell: ({ row }) => {
            const first = row.original.firstName ?? ''
            const last = row.original.lastName ?? ''
            const name = [first, last].filter(Boolean).join(' ').trim()
            return (
              <span className="font-medium text-slate-900">{name || '—'}</span>
            )
          },
        })
      )
    }
    if (canShowColumn(readableFields, 'username')) {
      cols.push(
        columnHelper.accessor('username', {
          header: 'Username',
          cell: (info) => (
            <span className="text-slate-700">{info.getValue() ?? '—'}</span>
          ),
        })
      )
    }
    if (canShowColumn(readableFields, 'email')) {
      cols.push(
        columnHelper.accessor('email', {
          header: 'Email',
          cell: (info) => (
            <span className="font-medium text-slate-900">{info.getValue() ?? '—'}</span>
          ),
        })
      )
    }
    if (canShowColumn(readableFields, 'mobileNumber')) {
      cols.push(
        columnHelper.accessor('mobileNumber', {
          header: 'Mobile',
          cell: (info) => (
            <span className="text-slate-600 text-sm">{info.getValue() ?? '—'}</span>
          ),
        })
      )
    }
    if (canShowColumn(readableFields, 'dateOfBirth')) {
      cols.push(
        columnHelper.accessor('dateOfBirth', {
          header: 'Date of birth',
          cell: (info) => {
            const val = info.getValue()
            if (!val) return <span className="text-slate-400">—</span>
            try {
              const d = new Date(val + 'T00:00:00')
              return (
                <span className="text-slate-600 text-sm">
                  {isNaN(d.getTime()) ? val : d.toLocaleDateString()}
                </span>
              )
            } catch {
              return <span className="text-slate-600 text-sm">{val}</span>
            }
          },
        })
      )
    }
    if (canShowColumn(readableFields, 'roles')) {
      cols.push(
        columnHelper.accessor('roles', {
          header: 'Roles',
          cell: (info) => (
            <div className="flex gap-1 flex-wrap">
              {(info.getValue() ?? []).map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          ),
        })
      )
    }
    if (canShowColumn(readableFields, 'isActive')) {
      cols.push(
        columnHelper.accessor('isActive', {
          header: 'Status',
          cell: (info) => (
            <Badge variant={info.getValue() ? 'default' : 'outline'} className="text-xs">
              {info.getValue() ? 'Active' : 'Inactive'}
            </Badge>
          ),
        })
      )
    }

    cols.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {canUpdate && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleManageAccess(row.original.id)}
                  className="h-8 w-8 p-0"
                  title="Manage access"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditUser(row.original.id)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChangePassword(row.original.id)}
                  className="h-8 w-8 p-0"
                  title="Change password"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteUser(row.original)}
                disabled={deleteUser.isPending}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      })
    )

    return cols
  }, [readableFields, canUpdate, canDelete, deleteUser.isPending, handleManageAccess, handleEditUser, handleChangePassword, handleDeleteUser])

  const table = useReactTable({
    data: allUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize } },
    state: { globalFilter: searchQuery },
    onGlobalFilterChange: setSearchQuery,
  })

  const currentPage = table.getState().pagination.pageIndex
  const totalPages = table.getPageCount()
  if (currentPage >= totalPages - 2 && hasNextPage && !isFetchingNextPage) {
    fetchNextPage()
  }

  const handleCreateUser = () => navigate('/users/create')
  const handleRefresh = () => refetch()

  return (
    <DashboardLayout>
      <motion.div
        className="p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-600 mt-1">Manage user accounts and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <PermissionGuard
              entity="user"
              action="create"
              fallback={
                <Button variant="default" size="sm" disabled className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create User
                </Button>
              }
            >
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateUser}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <PlusCircle className="h-4 w-4" />
                Create User
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by email, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              All Users ({allUsers.length})
              {isFetchingNextPage && (
                <span className="ml-2 text-sm text-slate-500">Loading more...</span>
              )}
            </CardTitle>
            <CardDescription>
              Complete list of user accounts in the system - Hybrid Pagination Active
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-16 h-16">
                  <Loader />
                </div>
              </div>
            ) : isError && error && isPermissionError(error) ? (
              <OperationNotPermitted context="You do not have permission to view users." />
            ) : allUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>
                      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>
                      Showing {table.getRowModel().rows.length} of {allUsers.length} users
                    </span>
                    {hasNextPage && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span className="text-indigo-600">More available</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  )
}
