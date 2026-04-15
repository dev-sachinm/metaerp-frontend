/**
 * Design & BOM types — Fixtures, BOM view, upload wizard
 */

// ── Fixture stage progression (5-stage pipeline) ────────────────────────────
export type FixtureStage =
  | 'bom_uploaded'
  | 'manufacturing_purchase'
  | 'assembly'
  | 'cmm'
  | 'dispatch'

export const FIXTURE_STAGE_ORDER: FixtureStage[] = [
  'bom_uploaded',
  'manufacturing_purchase',
  'assembly',
  'cmm',
  'dispatch',
]

export const FIXTURE_STAGE_LABELS: Record<FixtureStage, string> = {
  bom_uploaded:            'BOM Uploaded',
  manufacturing_purchase:  'Manufacturing & Purchase',
  assembly:                'Assembly',
  cmm:                     'CMM',
  dispatch:                'Dispatch',
}

/** @deprecated Use FixtureStage instead */
export type FixtureStatus = FixtureStage

/** @deprecated Use FIXTURE_STAGE_ORDER instead */
export const FIXTURE_STATUS_ORDER = FIXTURE_STAGE_ORDER
/** @deprecated Use FIXTURE_STAGE_LABELS instead */
export const FIXTURE_STATUS_LABELS = FIXTURE_STAGE_LABELS

export type FixtureStageDisplayStatus = 'completed' | 'current' | 'pending'

export interface FixtureStageInfo {
  stage: string
  label: string
  displayStatus: FixtureStageDisplayStatus
  enteredAt: string | null
}

// ── Fixture ──────────────────────────────────────────────────────────────────
export interface FixtureSummary {
  id: string
  fixtureNumber: string
  fixtureSeq: number
  stage: FixtureStage
  isActive: boolean
  bomFilename?: string | null
  bomUploadedAt?: string | null
  assemblyUserId?: string | null
  assemblyUserName?: string | null
  stageInfo?: FixtureStageInfo[]
  // Stage timestamps (available in list for progress bar / duration display)
  stageBomUploadedAt?: string | null
  stageMfgPurchaseStartedAt?: string | null
  stageAssemblyCompletedAt?: string | null
  stageCmmCompletedAt?: string | null
  stageDispatchAt?: string | null
  mfgPurchaseCompletedAt?: string | null
  assemblyStartedAt?: string | null
}

export interface Fixture extends FixtureSummary {
  description?: string | null
  bomUploadedBy?: string | null
  createdAt?: string | null
  modifiedAt?: string | null
  // Stage timestamps (1:1 with stages — shown on progress bar)
  stageBomUploadedAt?: string | null
  stageMfgPurchaseStartedAt?: string | null
  stageAssemblyCompletedAt?: string | null
  stageCmmCompletedAt?: string | null
  stageDispatchAt?: string | null
  // Milestone timestamps (for duration tracking)
  mfgPurchaseCompletedAt?: string | null
  assemblyStartedAt?: string | null
}

// ── BOM View ─────────────────────────────────────────────────────────────────
export interface ManufacturedPart {
  id: string
  fixtureId: string
  drawingNo: string
  description: string
  qty?: number | null
  receivedQuantity?: number | null
  lhRh?: string | null
  unitPrice?: number | null
  status?: string | null
  productId?: string | null
  vendorId?: string | null
  vendorName?: string | null
  fixtureSeq: number
  unitSeq: number
  partSeq: number
  drawingFileS3Key?: string | null
  pendingAt?: string | null
  inprogressAt?: string | null
  qualityCheckedAt?: string | null
  receivedAt?: string | null
  collectedByassemblyQuantity?: number | null
  collectedByUserId?: string | null
  collectedAt?: string | null
}

export interface StandardPart {
  id: string
  fixtureId: string
  productId?: string | null
  unitId?: string | null
  supplierId?: string | null
  supplierName?: string | null
  uom?: string | null
  lhRh?: string | null
  itemCode?: string | null
  productName?: string | null
  productMake?: string | null
  qty?: number | null
  receivedQuantity?: number | null
  currentStock?: number | null
  expectedQty?: number | null
  purchaseQty?: number | null
  purchaseUnitPrice?: number | null
  fixtureSeq?: number | null
  unitSeq?: number | null
  partSeq?: number | null
  collectedByassemblyQuantity?: number | null
  collectedByUserId?: string | null
  collectedAt?: string | null
}

export interface BomViewFixture {
  id: string
  fixtureNumber: string
  stage: FixtureStage
  stageInfo?: FixtureStageInfo[]
}

export interface BomView {
  fixture: BomViewFixture
  manufacturedParts: ManufacturedPart[]
  standardParts: StandardPart[]
}

// ── Drawing URL ───────────────────────────────────────────────────────────────
export interface DrawingViewUrl {
  viewUrl: string
  partId: string
  drawingNo: string
}

// ── BOM Parse (Step 2) ────────────────────────────────────────────────────────
export type BomChangeStatus = 'changed' | 'unchanged' | 'new' | null

export interface BomChangeEntry {
  field: string       // "description" | "quantity" | "lhRh" | "drawingFile"
  oldValue: string | null   // current DB value
  newValue: string | null   // parsed BOM value
}

export interface ParsedManufacturedPart {
  drawingNo: string
  description: string
  qty?: number | null
  lhRh?: string | null
  isWrongEntry: boolean
  wrongEntryReason?: string | null
  fixtureSeq?: number | null
  unitSeq?: number | null
  partSeq?: number | null
  parsedDrawingNo?: string | null
  hasDrawing: boolean
  isDuplicateInProject?: boolean
  duplicateFixtures?: { id: string; fixtureNumber: string; qty?: number | null }[]
  fixtureExists?: boolean
  existingFixtureId?: string | null
  existingFixtureNumber?: string | null
  // Re-upload diff fields
  changeStatus?: BomChangeStatus
  changes?: BomChangeEntry[]
  existingStatus?: string | null
  existingRowId?: string | null
  drawingFileChanged?: boolean
}

export interface ParsedStandardPart {
  drawingNo: string
  itemCode: string
  description: string
  qty: number
  lhRh?: string | null
  productFound: boolean
  productId?: string | null
  isWrongEntry: boolean
  wrongEntryReason?: string | null
  fixtureSeq?: number | null
  unitSeq?: number | null
  // Re-upload diff fields
  changeStatus?: BomChangeStatus
  changes?: BomChangeEntry[]
  existingRowId?: string | null
}

export interface WrongEntry {
  rowNum: number
  rawValue?: string | null
  reason: string
}

export interface BomParseError {
  rowNum: number
  rawValue?: string | null
  reason: string
}

export interface BomParseWarning {
  drawingNo: string
  description?: string | null
  qty?: number | null
  note: string
}

export interface ParseBomSummary {
  totalManufactured: number
  totalStandard: number
  wrongEntryCount: number
  errorCount?: number
  warningCount?: number
  duplicateDrawingCount?: number
  newFixtureSeqs?: number[]
  existingFixtureSeqs?: number[]
  // Re-upload summary
  changedCount?: number
  unchangedCount?: number
  newCount?: number
  notUpdatableCount?: number
}

export interface ParsedBom {
  summary: ParseBomSummary
  manufacturedParts: ParsedManufacturedPart[]
  standardParts: ParsedStandardPart[]
  wrongEntries: WrongEntry[]
  errors?: BomParseError[]
  warnings?: BomParseWarning[]
}

// ── Upload wizard resolution types ────────────────────────────────────────────
export interface WrongEntryResolution {
  originalDrawingNo: string
  action: 'skip' | 'override'
  correctedDrawingNo?: string
}

export interface ProductMatchResolution {
  itemCode: string
  /** Empty string means no product matched — backend stores the part without a product link */
  productId: string
}

export interface QuantityCorrection {
  drawingNo: string
  qty: number
}

// ── Upload URL response ───────────────────────────────────────────────────────
export interface DesignUploadUrl {
  uploadUrl: string
  s3Key: string
  fixtureId: string
}

// ── Submit BOM result ─────────────────────────────────────────────────────────
export interface SubmitBomResult {
  id: string
  fixtureNumber: string
  s3BomKey: string
  bomFilename: string
  bomUploadedAt: string
}
