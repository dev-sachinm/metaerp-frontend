import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/Loader'
import { useEmails, getAttachmentDownloadUrl } from '@/hooks/graphql/useEmail'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { ArrowLeft, Paperclip, Download } from 'lucide-react'

export function ViewEmail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useEmails()
  const emails = data?.emails ?? []

  const email = useMemo(
    () => emails.find((e) => e.id === id),
    [emails, id]
  )

  const queryFailed = Boolean(isError && error)
  const permissionDenied = queryFailed && isPermissionError(error)

  if (!id) {
    navigate('/emails', { replace: true })
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-600 hover:text-slate-900 -ml-2"
            onClick={() => navigate('/emails')}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Emails
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : permissionDenied ? (
          <div className="max-w-2xl mx-auto">
            <OperationNotPermitted context="You do not have permission to view this email." />
          </div>
        ) : queryFailed ? (
          <div className="max-w-2xl mx-auto text-center py-10 text-amber-800">
            <p className="font-medium">{getErrorMessage(error, 'Failed to load email')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : !email ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Email not found</CardTitle>
                <CardDescription>This email does not exist or you do not have access.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate('/emails')}>
                  Back to Emails
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{email.subject || '(no subject)'}</CardTitle>
              <CardDescription>
                {email.contextType
                  ? `Context: ${email.contextType}${email.contextId ? ` · ${email.contextId}` : ''}`
                  : 'No context'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold text-slate-700">To:</span> <span className="text-slate-800">{email.toAddress || '—'}</span></p>
                {email.ccAddress && (
                  <p><span className="font-semibold text-slate-700">CC:</span> <span className="text-slate-800">{email.ccAddress}</span></p>
                )}
                {email.bccAddress && (
                  <p><span className="font-semibold text-slate-700">BCC:</span> <span className="text-slate-800">{email.bccAddress}</span></p>
                )}
                <p className="text-xs text-slate-500">
                  {email.createdAt ? `Created at ${new Date(email.createdAt).toLocaleString()}` : ''}
                  {email.createdBy ? ` · Created by ${email.createdBy}` : ''}
                </p>
              </div>

              {(email.attachments?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments ({email.attachments!.length})
                  </p>
                  <ul className="list-none space-y-1.5">
                    {email.attachments!.map((att, i) => (
                      <li key={i}>
                        <a
                          href={getAttachmentDownloadUrl(att.s3Key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" />
                          {att.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg bg-slate-50/60 px-4 py-3 max-h-[480px] overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                  {email.body || '(empty body)'}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

