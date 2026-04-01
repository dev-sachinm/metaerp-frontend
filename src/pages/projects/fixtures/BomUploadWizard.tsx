import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader } from '@/components/Loader'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  ChevronRight,
  Copy,
} from 'lucide-react'
import {
  fetchProjectBomUploadUrl,
  useSubmitProjectBomUpload,
} from '@/hooks/graphql/useDesign'
import { fetchParseProjectBomFile } from '@/hooks/graphql/useDesignItemCode'
import type {
  ParsedBom,
  ParsedManufacturedPart,
  ParsedStandardPart,
  QuantityCorrection,
  WrongEntryResolution,
} from '@/types/design'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 ${i < current ? 'text-indigo-600 font-medium' : i === current ? 'text-indigo-500' : 'text-slate-300'}`}
        >
          <span
            className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < current
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : i === current
                ? 'border-indigo-500 text-indigo-500'
                : 'border-slate-200 text-slate-300'
            }`}
          >
            {i + 1}
          </span>
          {['Pick File', 'Review', 'Confirm'][i]}
          {i < total - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
        </span>
      ))}
    </div>
  )
}

// ── Step 1 — Pick & Upload (project-level) ────────────────────────────────────
interface Step1Props {
  projectId: string
  onDone: (s3Key: string) => void
}

function Step1Upload({ projectId, onDone }: Step1Props) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Only .zip files are accepted.')
      return
    }
    setFile(f)
    setErrorMsg('')
  }

  const handleUpload = useCallback(async () => {
    if (!file) return
    setStatus('uploading')
    setProgress(0)
    try {
      const { uploadUrl, s3Key } = await fetchProjectBomUploadUrl(projectId, file.name)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', 'application/zip')
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      setStatus('done')
      setProgress(100)
      onDone(s3Key)
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [file, projectId, onDone])

  return (
    <div className="space-y-5">
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">
          {file ? file.name : 'Click to pick a .zip file'}
        </p>
        {file && (
          <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          ZIP must contain one .xlsx BOM spreadsheet + drawing files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="h-4 w-4" /> {errorMsg}
        </p>
      )}

      {status === 'uploading' && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'done' && (
        <p className="text-sm text-green-700 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" /> Upload complete — parsing BOM…
        </p>
      )}

      <Button
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        disabled={!file || status === 'uploading' || status === 'done'}
        onClick={handleUpload}
      >
        {status === 'uploading' ? 'Uploading…' : 'Upload'}
      </Button>
    </div>
  )
}

// ── Step 2 — Preview & Resolve (project-level parse) ──────────────────────────
interface Step2Props {
  projectId: string
  s3Key: string
  onDone: (wr: WrongEntryResolution[], qc: QuantityCorrection[]) => void
  onBack: () => void
}

function Step2Review({ projectId, s3Key, onDone, onBack }: Step2Props) {
  const [parsed, setParsed] = useState<ParsedBom | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [wrongResolutions, setWrongResolutions] = useState<Record<string, WrongEntryResolution>>({})
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    fetchParseProjectBomFile(projectId, s3Key)
      .then((b) => {
        if (!cancelled) {
          setParsed(b)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to parse BOM')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId, s3Key])

  const wrongEntryDrawings = (parsed?.manufacturedParts ?? []).filter((p) => p.isWrongEntry).map((p) => p.drawingNo)
  const unresolvedCount = wrongEntryDrawings.filter((d) => {
    const r = wrongResolutions[d]
    if (!r) return true
    if (r.action === 'skip') return false
    if (r.action === 'override' && r.correctedDrawingNo) return false
    return true
  }).length
  const wrongStandardParts = (parsed?.standardParts ?? []).filter((p) => p.isWrongEntry).length
  const canProceed = unresolvedCount === 0 && wrongStandardParts === 0

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader />
        <p className="text-sm text-slate-500">Parsing BOM file…</p>
      </div>
    )
  }

  if (loadError || !parsed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="h-4 w-4" /> {loadError || 'Failed to parse BOM'}
        </p>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
    )
  }

  const { summary, manufacturedParts, standardParts, wrongEntries } = parsed

  const handleNext = () => {
    const wr: WrongEntryResolution[] = Object.values(wrongResolutions)
    const qc: QuantityCorrection[] = Object.entries(qtyOverrides)
      .filter(([drawingNo, qty]) => {
        const original = manufacturedParts.find((p) => p.drawingNo === drawingNo)
        return original && qty !== (original.qty ?? 0)
      })
      .map(([drawingNo, qty]) => ({ drawingNo, qty }))
    onDone(wr, qc)
  }

  const duplicateCount = summary.duplicateDrawingCount ?? 0
  const newFixtures = summary.newFixtureSeqs ?? []
  const existingFixtures = summary.existingFixtureSeqs ?? []

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Manufactured', value: summary.totalManufactured, color: 'text-indigo-600' },
          { label: 'Standard', value: summary.totalStandard, color: 'text-teal-600' },
          { label: 'Wrong Entries', value: summary.wrongEntryCount, color: 'text-red-600' },
          { label: 'Duplicates (skip)', value: duplicateCount, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 py-3">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Fixture info */}
      {(newFixtures.length > 0 || existingFixtures.length > 0) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
          {newFixtures.length > 0 && (
            <p>New fixtures to create: <span className="font-semibold text-indigo-600">{newFixtures.join(', ')}</span></p>
          )}
          {existingFixtures.length > 0 && (
            <p>Existing fixtures to update: <span className="font-semibold text-slate-800">{existingFixtures.join(', ')}</span></p>
          )}
        </div>
      )}

      {duplicateCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <Copy className="h-4 w-4" />
          {duplicateCount} drawing{duplicateCount > 1 ? 's' : ''} already exist in this project and will be skipped automatically.
        </div>
      )}

      {/* Manufactured parts */}
      {manufacturedParts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Manufactured Parts ({manufacturedParts.length})
          </h4>
          <div className="rounded-lg border border-slate-200 divide-y text-sm">
            {manufacturedParts.map((p: ParsedManufacturedPart, i) => {
              const isDupe = p.isDuplicateInProject
              const dupeFixtures = p.duplicateFixtures ?? []
              const dupeInfo =
                isDupe && dupeFixtures.length > 0
                  ? `Duplicate — already in: ${dupeFixtures.map((f) => f.fixtureNumber).join(', ')}`
                  : isDupe
                  ? 'Duplicate — will be skipped'
                  : null
              const resolution = wrongResolutions[p.drawingNo]
              const isSkipped = p.isWrongEntry && resolution?.action === 'skip'
              const isOverridden = p.isWrongEntry && resolution?.action === 'override' && !!resolution.correctedDrawingNo

              let rowBg = ''
              if (isDupe) {
                rowBg = 'bg-slate-50 opacity-60'
              } else if (isSkipped) {
                rowBg = 'bg-orange-50 border-l-4 border-l-orange-400'
              } else if (p.isWrongEntry) {
                rowBg = 'bg-red-50'
              } else if (!p.hasDrawing) {
                rowBg = 'bg-amber-50'
              }

              let icon: React.ReactNode
              if (isDupe) {
                icon = <Copy className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              } else if (isSkipped) {
                icon = <XCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              } else if (p.isWrongEntry) {
                icon = <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              } else if (!p.hasDrawing) {
                icon = <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              } else {
                icon = <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              }

              return (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 ${rowBg}`}>
                {icon}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-slate-500">{p.drawingNo}</span>
                  {' '}
                  <span className={`text-slate-800 ${isDupe || isSkipped ? 'line-through opacity-60' : ''}`}>{p.description}</span>
                  {isDupe && (
                    <span className="ml-2 text-xs font-semibold text-slate-500 bg-slate-200 rounded px-1.5 py-0.5">DUPLICATE — SKIP</span>
                  )}
                  {isSkipped && !isDupe && (
                    <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 rounded px-1.5 py-0.5">SKIPPED</span>
                  )}
                  {isOverridden && !isDupe && (
                    <span className="ml-2 text-xs font-semibold text-indigo-600 bg-indigo-100 rounded px-1.5 py-0.5">→ {resolution.correctedDrawingNo}</span>
                  )}
                  {p.fixtureSeq != null && !isDupe && (
                    <span className="ml-2 text-xs text-slate-400">
                      F-{String(p.fixtureSeq).padStart(3, '0')}
                      {p.fixtureExists ? '' : ' (new)'}
                    </span>
                  )}
                  {!p.hasDrawing && !p.isWrongEntry && !isDupe && (
                    <p className="text-xs text-amber-600 mt-0.5">⚠ Drawing not found in ZIP</p>
                  )}
                  {dupeInfo && (
                    <p className="text-xs text-slate-500 mt-0.5">{dupeInfo}</p>
                  )}
                  {p.isWrongEntry && !isDupe && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-red-600">{p.wrongEntryReason}</p>
                      <div className="flex items-center gap-2">
                        <button
                          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                            resolution?.action === 'skip'
                              ? 'border-orange-500 bg-orange-100 text-orange-700 font-semibold'
                              : 'border-slate-200 hover:border-orange-400 hover:bg-orange-50'
                          }`}
                          onClick={() => setWrongResolutions((prev) => ({
                            ...prev,
                            [p.drawingNo]: { originalDrawingNo: p.drawingNo, action: 'skip' },
                          }))}
                        >
                          Skip
                        </button>
                        <span className="text-slate-400 text-xs">or Override:</span>
                        <input
                          type="text"
                          placeholder="Correct drawing no."
                          className="text-xs border border-slate-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={resolution?.action === 'override' ? resolution.correctedDrawingNo ?? '' : ''}
                          onChange={(e) => setWrongResolutions((prev) => ({
                            ...prev,
                            [p.drawingNo]: {
                              originalDrawingNo: p.drawingNo,
                              action: 'override',
                              correctedDrawingNo: e.target.value,
                            },
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {!isDupe && !isSkipped && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">qty:</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={`w-14 text-xs text-right border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                          (qtyOverrides[p.drawingNo] ?? p.qty ?? 0) === 0
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-700'
                        }`}
                        value={qtyOverrides[p.drawingNo] ?? p.qty ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          setQtyOverrides((prev) => ({
                            ...prev,
                            [p.drawingNo]: isNaN(val) ? 0 : val,
                          }))
                        }}
                      />
                    </div>
                  )}
                  {(isDupe || isSkipped) && p.qty != null && (
                    <span className="text-xs text-slate-400">qty:{p.qty}</span>
                  )}
                  {p.lhRh && <span className="text-xs text-slate-400">({p.lhRh})</span>}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Standard parts */}
      {standardParts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Standard Parts ({standardParts.filter((p: ParsedStandardPart) => !p.isWrongEntry).length} linked
            {standardParts.filter((p: ParsedStandardPart) => p.isWrongEntry).length > 0 &&
              `, ${standardParts.filter((p: ParsedStandardPart) => p.isWrongEntry).length} not in master`})
          </h4>
          <div className="rounded-lg border border-slate-200 divide-y text-sm">
            {standardParts.map((p: ParsedStandardPart, i) => (
              <div key={i} className={`px-3 py-2 flex items-start gap-3 ${p.isWrongEntry ? 'bg-red-50/50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{p.drawingNo}</span>
                    <span className="font-mono text-xs text-indigo-600">{p.itemCode}</span>
                    <span className="text-slate-700 truncate">{p.description}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">qty: {p.qty ?? '—'}</span>
                    {p.lhRh && <span className="text-xs text-slate-400">{p.lhRh}</span>}
                    {p.isWrongEntry && p.wrongEntryReason && (
                      <span className="text-xs text-red-600 italic">{p.wrongEntryReason}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  {!p.productFound && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      ✗ Not in master
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {standardParts.some((p: ParsedStandardPart) => p.isWrongEntry) && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
              ⚠ Parts marked "Not in master" must be added to the Product master before re-uploading.
            </p>
          )}
        </div>
      )}

      {/* Wrong-entry summary */}
      {wrongEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
            Skipped Rows ({wrongEntries.length})
          </h4>
          <div className="rounded-lg border border-red-100 bg-red-50 divide-y text-xs">
            {wrongEntries.map((w, i) => (
              <div key={i} className="px-3 py-1.5 text-red-700">
                Row {w.rowNum}: {w.rawValue ?? '(no value)'} — {w.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 sticky bottom-0 bg-white pb-1">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <div className="flex items-center gap-3">
          {!canProceed && (
            <span className="text-xs text-red-600 font-medium">
              {unresolvedCount} wrong {unresolvedCount === 1 ? 'entry' : 'entries'} must be skipped or corrected
            </span>
          )}
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleNext}
            disabled={!canProceed}
          >
            Next: Confirm →
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Step 3 — Confirm & Submit (project-level) ─────────────────────────────────
interface Step3Props {
  projectId: string
  s3Key: string
  filename: string
  wrongEntryResolutions: WrongEntryResolution[]
  quantityCorrections: QuantityCorrection[]
  onSuccess: () => void
  onBack: () => void
}

function Step3Confirm({ projectId, s3Key, filename, wrongEntryResolutions, quantityCorrections, onSuccess, onBack }: Step3Props) {
  const submit = useSubmitProjectBomUpload(projectId)

  const handleSubmit = async () => {
    await submit.mutateAsync({
      projectId,
      s3Key,
      filename,
      wrongEntryResolutions,
      ...(quantityCorrections.length > 0 ? { quantityCorrections } : {}),
    })
    onSuccess()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y text-sm">
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-slate-500">File</span>
          <span className="font-medium font-mono">{filename}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-slate-500">Wrong-entry resolutions</span>
          <span className="font-medium">{wrongEntryResolutions.length}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-slate-500">Quantity corrections</span>
          <span className="font-medium">{quantityCorrections.length}</span>
        </div>
        <div className="px-4 py-2.5 flex justify-between">
          <span className="text-slate-500">Standard parts</span>
          <span className="font-medium">Auto-resolved from products master</span>
        </div>
      </div>

      {wrongEntryResolutions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resolutions</p>
          <ul className="text-xs space-y-0.5 text-slate-600">
            {wrongEntryResolutions.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                {r.action === 'skip'
                  ? <span className="text-slate-400">Skip: <span className="font-mono">{r.originalDrawingNo}</span></span>
                  : <span className="text-indigo-600">Override <span className="font-mono">{r.originalDrawingNo}</span> → <span className="font-mono">{r.correctedDrawingNo}</span></span>
                }
              </li>
            ))}
          </ul>
        </div>
      )}

      {quantityCorrections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Quantity Corrections</p>
          <ul className="text-xs space-y-0.5 text-slate-600">
            {quantityCorrections.map((qc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="font-mono">{qc.drawingNo}</span>
                <span className="text-indigo-600 font-medium">→ qty: {qc.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submit.isError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="h-4 w-4" /> Failed to submit — please try again.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submit.isPending}>← Back</Button>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleSubmit}
          disabled={submit.isPending}
        >
          {submit.isPending ? 'Submitting…' : 'Confirm & Save BOM'}
        </Button>
      </div>
    </div>
  )
}

// ── Wizard orchestrator ───────────────────────────────────────────────────────
interface BomUploadWizardProps {
  projectId: string
  onClose: () => void
}

export function BomUploadWizard({ projectId, onClose }: BomUploadWizardProps) {
  const [step, setStep] = useState(0)
  const [s3Key, setS3Key] = useState('')
  const [filename, setFilename] = useState('')
  const [wrongResolutions, setWrongResolutions] = useState<WrongEntryResolution[]>([])
  const [quantityCorrections, setQuantityCorrections] = useState<QuantityCorrection[]>([])
  const handleStep1Done = (key: string) => {
    setS3Key(key)
    setFilename(key.split('/').pop() ?? key)
    setStep(1)
  }

  const handleStep2Done = (wr: WrongEntryResolution[], qc: QuantityCorrection[]) => {
    setWrongResolutions(wr)
    setQuantityCorrections(qc)
    setStep(2)
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Upload BOM</DialogTitle>
            <StepDots current={step} total={3} />
          </div>
        </DialogHeader>

        <div className="mt-2">
          {step === 0 && (
            <Step1Upload
              projectId={projectId}
              onDone={handleStep1Done}
            />
          )}
          {step === 1 && s3Key && (
            <Step2Review
              projectId={projectId}
              s3Key={s3Key}
              onDone={handleStep2Done}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <Step3Confirm
              projectId={projectId}
              s3Key={s3Key}
              filename={filename}
              wrongEntryResolutions={wrongResolutions}
              quantityCorrections={quantityCorrections}
              onSuccess={onClose}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
