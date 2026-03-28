import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { useEmails, type Email } from '@/hooks/graphql/useEmail'
import { Paperclip } from 'lucide-react'

export function EmailsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const contextType = searchParams.get('contextType') ?? ''
  const contextId = searchParams.get('contextId') ?? ''
  const search = searchParams.get('search') ?? ''
  const navigate = useNavigate()

  const setContextType = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('contextType', value)
      else next.delete('contextType')
      return next
    })
  }
  const setContextId = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('contextId', value)
      else next.delete('contextId')
      return next
    })
  }
  const setSearch = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('search', value)
      else next.delete('search')
      return next
    })
  }

  const { data, isLoading, isError, error, refetch } = useEmails(
    contextType || undefined,
    contextId || undefined
  )

  const items = data?.emails ?? []
  const normalizedSearch = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedSearch) return items
    return items.filter((e) => {
      const attachText = (e.attachments ?? []).map((a) => a.filename).join(' ')
      const text = `${e.subject ?? ''} ${e.toAddress ?? ''} ${e.ccAddress ?? ''} ${e.contextType ?? ''} ${e.contextId ?? ''} ${attachText}`.toLowerCase()
      return text.includes(normalizedSearch)
    })
  }, [items, normalizedSearch])

  const queryFailed = Boolean(isError && error)
  const permissionDenied = queryFailed && isPermissionError(error)

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Emails</h1>
            <p className="text-slate-600 text-sm mt-1">
              Stored emails for debugging and audit. Filter by context to see emails linked to a project or other entities.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Use context filters to narrow down emails for a given entity or record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Context Type</label>
                <Input
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value)}
                  placeholder="e.g. project, purchase_order"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Context ID</label>
                <Input
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
                  placeholder="UUID or external key (optional)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by subject, recipient, or context…"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emails ({filtered.length})</CardTitle>
            <CardDescription>
              {filtered.length === 0 ? 'No emails found for the current filters.' : 'Click a row to see full details.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader />
              </div>
            ) : permissionDenied ? (
              <OperationNotPermitted context="You do not have permission to view emails." />
            ) : queryFailed ? (
              <div className="text-center py-10 text-amber-800">
                <p className="font-medium">{getErrorMessage(error, 'Failed to load emails')}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p className="font-medium">No emails found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">To</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Context</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Attachments</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((email: Email) => {
                      const attachments = email.attachments ?? []
                      return (
                        <tr
                          key={email.id}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                          onClick={() => navigate(`/emails/${email.id}`)}
                        >
                          <td className="px-3 py-2 text-sm text-slate-800 max-w-[260px] truncate" title={email.subject}>
                            {email.subject || '(no subject)'}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {email.toAddress || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {email.contextType ? `${email.contextType}${email.contextId ? ` · ${email.contextId}` : ''}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            {attachments.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600" title={attachments.map((a) => a.filename).join(', ')}>
                                <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                            {email.createdAt ? new Date(email.createdAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

