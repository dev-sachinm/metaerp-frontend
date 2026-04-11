import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { GET_EMAILS } from '@/graphql/queries/email.queries'

export interface EmailAttachment {
  s3Key: string
  filename: string
}

export interface Email {
  id: string
  subject: string
  body: string
  toAddress?: string | null
  ccAddress?: string | null
  bccAddress?: string | null
  contextType?: string | null
  contextId?: string | null
  attachments?: EmailAttachment[] | null
  createdAt?: string | null
  createdBy?: string | null
}

/** Build download URL for an email attachment (s3Key). Backend may expose e.g. /api/attachments/download?key= or /fake-s3-download?key= */
export function getAttachmentDownloadUrl(s3Key: string): string {
  const base = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql'
  const origin = base.replace(/\/graphql\/?$/, '')
  const path = import.meta.env.VITE_ATTACHMENT_DOWNLOAD_PATH || '/api/attachments/download'
  return `${origin}${path}?key=${encodeURIComponent(s3Key)}`
}

function parseAttachments(attachments: unknown): EmailAttachment[] {
  if (Array.isArray(attachments)) return attachments as EmailAttachment[]
  if (typeof attachments === 'string') {
    try {
      const parsed = JSON.parse(attachments) as EmailAttachment[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function useEmails(contextType?: string, contextId?: string) {
  return useQuery({
    queryKey: ['emails', contextType ?? null, contextId ?? null],
    queryFn: async () => {
      const res = await executeGraphQL<{ emails: (Omit<Email, 'attachments'> & { attachments?: unknown })[] }>(GET_EMAILS, {
        contextType,
        contextId,
      })
      return {
        emails: res.emails.map((e) => ({
          ...e,
          attachments: parseAttachments(e.attachments),
        })),
      }
    },
    staleTime: 30 * 1000,
  })
}

