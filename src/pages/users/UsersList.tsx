import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useEntityActions, useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Loader } from '@/components/Loader'
import { useUsers, useDeleteUser, type User } from '@/hooks/graphql/useUsersQuery'
import { useGetAllRoles } from '@/hooks/graphql/useUserRolesAccess'
import { motion } from 'framer-motion'
import {
  PlusCircle, Search, Edit2, Trash2, ShieldCheck, Filter, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, KeyRound, X,
} from 'lucide-react'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'

export function UsersList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')

  const { canUpdate, canDelete } = useEntityActions('user')
  const { canRead: canReadRoles } = useEntityActions('role')

  // When searching: fetch max page (200) so client-side filter covers all users.
  // Backend has no text-search param for users, so this is the only way to search across pages.
  const isSearching = searchQuery.trim().length > 0
  const { data, isLoading, isError, error, refetch } = useUsers(
    isSearching ? 1 : page,
    isSearching ? 200 : pageSize,
    selectedRoleId || null,
  )
  const deleteUser = useDeleteUser()
  const readableFields = useAccessibleFields('user', 'read')
  const { data: rolesData } = useGetAllRoles()
  const allRoles = canReadRoles ? (rolesData?.getRoles ?? []) : []

  const list = data?.users
  const rawItems: User[] = list?.items ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1
  const hasMore = list?.hasMore ?? false
  const firstPage = list?.firstPage ?? 1
  const lastPage = list?.lastPage ?? totalPages

  const normalizedQ = searchQuery.trim().toLowerCase()
  const items = useMemo(() => {
    if (!normalizedQ) return rawItems
    return rawItems.filter((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase()
      return (
        name.includes(normalizedQ) ||
        u.username?.toLowerCase().includes(normalizedQ) ||
        u.email?.toLowerCase().includes(normalizedQ)
      )
    })
  }, [rawItems, normalizedQ])

  // Pagination counts: when searching show filtered count, otherwise use server totals
  const displayTotal = isSearching ? items.length : total
  const from = displayTotal === 0 ? 0 : isSearching ? 1 : (page - 1) * pageSize + 1
  const to = isSearching ? items.length : Math.min(page * pageSize, total)

  function resetPage() { setPage(1) }

  const handleManageAccess = useCallback((userId: string) => {
    if (!canUpdate) { toast.error('You do not have permission to manage user access.'); return }
    navigate(`/users/${userId}/access`)
  }, [canUpdate, navigate])

  const handleEditUser = useCallback((userId: string) => {
    if (!canUpdate) { toast.error('You do not have permission to edit users.'); return }
    navigate(`/users/${userId}/edit`)
  }, [canUpdate, navigate])

  const handleChangePassword = useCallback((userId: string) => {
    if (!canUpdate) { toast.error('You do not have permission to change user password.'); return }
    navigate(`/users/${userId}/change-password`)
  }, [canUpdate, navigate])

  const handleDeleteUser = useCallback((user: User) => {
    if (!canDelete) { toast.error('You do not have permission to delete users.'); return }
    const label = user.email || user.username || 'this user'
    if (confirm(`Are you sure you want to delete ${label}?`)) {
      deleteUser.mutate(user.id, {
        onSuccess: (data) => {
          if (data.deleteUser) toast.success('User deleted successfully')
          else toast.error('User not found or could not be deleted')
        },
        onError: (err: Error) => {
          if (!isPermissionError(err)) toast.error(getErrorMessage(err, 'Failed to delete user'))
        },
      })
    }
  }, [canDelete, deleteUser])

  const isFirst = page <= firstPage
  const isLast = page >= lastPage || (!hasMore && page >= totalPages)

  const PaginationBar = () => isSearching ? null : (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-600">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => setPage(firstPage)} disabled={isFirst} title="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={isFirst} title="Previous page">
          <ChevronLeft className="h-4 w-4" />Prev
        </Button>
        <span className="px-3 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={isLast} title="Next page">
          Next<ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(lastPage)} disabled={isLast} title="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <motion.div
        className="p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-600 mt-1">Manage user accounts and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />Refresh
            </Button>
            <PermissionGuard
              entity="user"
              action="create"
              fallback={
                <Button variant="default" size="sm" disabled className="gap-2">
                  <PlusCircle className="h-4 w-4" />Create User
                </Button>
              }
            >
              <Button
                variant="default" size="sm"
                onClick={() => navigate('/users/create')}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <PlusCircle className="h-4 w-4" />Create User
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Filter bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by name, email, username…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {canReadRoles && (
                <div className="relative flex items-center gap-1.5 shrink-0">
                  <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedRoleId}
                    onChange={(e) => { setSelectedRoleId(e.target.value); resetPage() }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[160px]"
                  >
                    <option value="">All roles</option>
                    {allRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {selectedRoleId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedRoleId(''); resetPage() }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                      title="Clear role filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                All Users ({displayTotal})
                {isSearching && total > 200 && (
                  <span className="ml-2 text-sm font-normal text-slate-400">searching first 200 of {total}</span>
                )}
              </CardTitle>
              <CardDescription>
                {!isLoading && displayTotal > 0 && `Showing ${from}–${to}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader /></div>
            ) : isError && isPermissionError(error) ? (
              <OperationNotPermitted context="You do not have permission to view users." />
            ) : isError ? (
              <div className="text-center py-10 text-red-600">{getErrorMessage(error, 'Failed to load users')}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 mb-2"><PaginationBar /></div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(canShowColumn(readableFields, 'firstName') || canShowColumn(readableFields, 'lastName')) && <TableHead>Name</TableHead>}
                      {canShowColumn(readableFields, 'username') && <TableHead>Username</TableHead>}
                      {canShowColumn(readableFields, 'email') && <TableHead>Email</TableHead>}
                      {canShowColumn(readableFields, 'mobileNumber') && <TableHead>Mobile</TableHead>}
                      {canShowColumn(readableFields, 'dateOfBirth') && <TableHead>Date of birth</TableHead>}
                      {canReadRoles && <TableHead>Roles</TableHead>}
                      {canShowColumn(readableFields, 'isActive') && <TableHead>Status</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((user) => (
                      <TableRow key={user.id}>
                        {(canShowColumn(readableFields, 'firstName') || canShowColumn(readableFields, 'lastName')) && (
                          <TableCell>
                            <span className="font-medium text-slate-900">
                              {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                            </span>
                          </TableCell>
                        )}
                        {canShowColumn(readableFields, 'username') && (
                          <TableCell><span className="text-slate-700">{user.username ?? '—'}</span></TableCell>
                        )}
                        {canShowColumn(readableFields, 'email') && (
                          <TableCell><span className="font-medium text-slate-900">{user.email ?? '—'}</span></TableCell>
                        )}
                        {canShowColumn(readableFields, 'mobileNumber') && (
                          <TableCell><span className="text-slate-600 text-sm">{user.mobileNumber ?? '—'}</span></TableCell>
                        )}
                        {canShowColumn(readableFields, 'dateOfBirth') && (
                          <TableCell>
                            {user.dateOfBirth ? (() => {
                              try {
                                const d = new Date(user.dateOfBirth + 'T00:00:00')
                                return <span className="text-slate-600 text-sm">{isNaN(d.getTime()) ? user.dateOfBirth : d.toLocaleDateString()}</span>
                              } catch { return <span className="text-slate-600 text-sm">{user.dateOfBirth}</span> }
                            })() : <span className="text-slate-400">—</span>}
                          </TableCell>
                        )}
                        {canReadRoles && (
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(user.roles ?? []).length > 0
                                ? user.roles.map((role) => (
                                    <Badge key={role.id} variant="secondary" className="text-xs">{role.name}</Badge>
                                  ))
                                : <span className="text-slate-400 text-xs">—</span>
                              }
                            </div>
                          </TableCell>
                        )}
                        {canShowColumn(readableFields, 'isActive') && (
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'outline'} className="text-xs">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canUpdate && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleManageAccess(user.id)} className="h-8 w-8 p-0" title="Manage access">
                                  <ShieldCheck className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEditUser(user.id)} className="h-8 w-8 p-0">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleChangePassword(user.id)} className="h-8 w-8 p-0" title="Change password">
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deleteUser.isPending}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="border-t border-slate-200 mt-2"><PaginationBar /></div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  )
}
