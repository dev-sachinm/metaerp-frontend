/**
 * Rich email body editor using React Quill.
 */
import { useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
function stripScripts(html: string): string {
  return html.replace(SCRIPT_REGEX, '')
}

export interface EmailComposeEditorProps {
  subject: string
  body: string
  onSubjectChange: (value: string) => void
  onBodyChange: (value: string) => void
  subjectPlaceholder?: string
  bodyPlaceholder?: string
  minHeight?: string
  disabled?: boolean
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}

export function EmailComposeEditor(props: EmailComposeEditorProps) {
  const {
    subject,
    body,
    onSubjectChange,
    onBodyChange,
    subjectPlaceholder = 'Subject',
    bodyPlaceholder = 'Compose your message…',
    minHeight = '180px',
    disabled = false,
  } = props
  const safeBody = useMemo(() => stripScripts(body), [body])

  const handleBodyChange = (value: string) => {
    onBodyChange(stripScripts(value))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
        <input
          type="text"
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={subjectPlaceholder}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
        <div className="rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[140px]">
          <ReactQuill
            theme="snow"
            value={safeBody}
            onChange={handleBodyChange}
            placeholder={bodyPlaceholder}
            modules={modules}
            readOnly={disabled}
            style={{ minHeight }}
          />
        </div>
      </div>
    </div>
  )
}
