import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { toast } from 'sonner'
import {
  GET_FIXTURES,
  GET_FIXTURE,
  GET_BOM_VIEW,
  GET_DRAWING_VIEW_URL,
  GET_DESIGN_UPLOAD_URL,
  PARSE_BOM_FILE,
  GET_PROJECT_BOM_UPLOAD_URL,
  PARSE_PROJECT_BOM_FILE,
} from '@/graphql/queries/design.queries'
import {
  CREATE_FIXTURE,
  UPDATE_FIXTURE,
  DELETE_FIXTURE,
  SUBMIT_BOM_UPLOAD,
  SUBMIT_PROJECT_BOM_UPLOAD,
} from '@/graphql/mutations/design.mutations'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import type {
  BomView,
  DesignUploadUrl,
  DrawingViewUrl,
  Fixture,
  FixtureSummary,
  ParsedBom,
  ProductMatchResolution,
  SubmitBomResult,
  WrongEntryResolution,
} from '@/types/design'
import type { PaginatedList } from '@/types/projectManagement'

// ── Query Keys ────────────────────────────────────────────────────────────────
export interface BomViewFilters {
  drawingNo?: string
  drawingDesc?: string
  stdPartNo?: string
  stdName?: string
  stdMake?: string
}

export const designKeys = {
  all: ['design'] as const,
  fixtures: (projectId: string, status?: string) =>
    [...designKeys.all, 'fixtures', projectId, status ?? 'all'] as const,
  fixture: (id: string) => [...designKeys.all, 'fixture', id] as const,
  bomView: (fixtureId: string, filters?: BomViewFilters) =>
    [
      ...designKeys.all,
      'bomView',
      fixtureId,
      filters?.drawingNo ?? '',
      filters?.drawingDesc ?? '',
      filters?.stdPartNo ?? '',
      filters?.stdName ?? '',
      filters?.stdMake ?? '',
    ] as const,
}

// ── Input interfaces ──────────────────────────────────────────────────────────
export interface CreateFixtureInput {
  projectId: string
  description?: string | null
}

export interface UpdateFixtureInput {
  description?: string | null
  status?: string | null
  isActive?: boolean
}

export interface BomSubmitInput {
  fixtureId: string
  s3Key: string
  filename: string
  wrongEntryResolutions: WrongEntryResolution[]
  productMatchResolutions: ProductMatchResolution[]
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function useFixtures(projectId: string | null, status?: string) {
  return useQuery({
    queryKey: designKeys.fixtures(projectId ?? '', status),
    queryFn: () =>
      executeGraphQL<{ fixtures: PaginatedList<FixtureSummary> }>(GET_FIXTURES, {
        projectId: projectId!,
        skip: 0,
        limit: 100,
        status,
      }),
    enabled: !!projectId,
    staleTime: 15 * 1000,
  })
}

export function useFixture(id: string | null) {
  return useQuery({
    queryKey: designKeys.fixture(id ?? ''),
    queryFn: () => executeGraphQL<{ fixture: Fixture | null }>(GET_FIXTURE, { id: id! }),
    enabled: !!id,
    staleTime: 15 * 1000,
  })
}

export function useBomView(
  fixtureId: string | null,
  enabled = true,
  filters?: BomViewFilters
) {
  return useQuery({
    queryKey: designKeys.bomView(fixtureId ?? '', filters),
    queryFn: () =>
      executeGraphQL<{ bomView: BomView | null }>(GET_BOM_VIEW, {
        fixtureId: fixtureId!,
        drawingNo: filters?.drawingNo || undefined,
        drawingDesc: filters?.drawingDesc || undefined,
        stdPartNo: filters?.stdPartNo || undefined,
        stdName: filters?.stdName || undefined,
        stdMake: filters?.stdMake || undefined,
      }),
    enabled: !!fixtureId && enabled,
    staleTime: 30 * 1000,
  })
}

/** One-shot: get presigned S3 upload URL. Not cached — call directly. */
export async function fetchDesignUploadUrl(fixtureId: string, filename: string) {
  const res = await executeGraphQL<{ getDesignUploadUrl: DesignUploadUrl }>(GET_DESIGN_UPLOAD_URL, {
    fixtureId,
    filename,
  })
  return res.getDesignUploadUrl
}

/** Project-level: get presigned S3 upload URL (no fixture needed). */
export async function fetchProjectBomUploadUrl(projectId: string, filename: string) {
  const res = await executeGraphQL<{ getProjectBomUploadUrl: { uploadUrl: string; s3Key: string; projectId: string } }>(
    GET_PROJECT_BOM_UPLOAD_URL,
    { projectId, filename }
  )
  return res.getProjectBomUploadUrl
}

/** Project-level: parse BOM — fixture identity from drawing numbers. */
export async function fetchParseProjectBomFile(projectId: string, s3Key: string) {
  const res = await executeGraphQL<{ parseProjectBomFile: ParsedBom }>(PARSE_PROJECT_BOM_FILE, { projectId, s3Key })
  return res.parseProjectBomFile
}

/** One-shot: parse BOM from S3. Not cached — call directly. */
export async function fetchParseBomFile(fixtureId: string, s3Key: string) {
  const res = await executeGraphQL<{ parseBomFile: ParsedBom }>(PARSE_BOM_FILE, { fixtureId, s3Key })
  return res.parseBomFile
}

/** One-shot: get drawing view URL. Not cached — call imperatively. */
export async function fetchDrawingViewUrl(partId: string) {
  const res = await executeGraphQL<{ getDrawingViewUrl: DrawingViewUrl }>(GET_DRAWING_VIEW_URL, { partId })
  return res.getDrawingViewUrl
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useCreateFixture(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFixtureInput) =>
      executeGraphQL<{ createFixture: FixtureSummary }>(CREATE_FIXTURE, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.fixtures(projectId) })
      toast.success('Fixture created')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create fixture'))
    },
  })
}

export function useUpdateFixture(fixtureId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateFixtureInput) =>
      executeGraphQL<{ updateFixture: Partial<Fixture> }>(UPDATE_FIXTURE, { id: fixtureId, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.fixture(fixtureId) })
      queryClient.invalidateQueries({ queryKey: designKeys.fixtures(projectId) })
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success('Fixture updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update fixture'))
    },
  })
}

export function useDeleteFixture(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fixtureId: string) =>
      executeGraphQL<{ deleteFixture: boolean }>(DELETE_FIXTURE, { id: fixtureId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.fixtures(projectId) })
      toast.success('Fixture deleted')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete fixture'))
    },
  })
}

export function useSubmitBomUpload(fixtureId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BomSubmitInput) =>
      executeGraphQL<{ submitBomUpload: SubmitBomResult }>(SUBMIT_BOM_UPLOAD, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      queryClient.invalidateQueries({ queryKey: designKeys.fixtures(projectId) })
      toast.success('BOM uploaded successfully')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to submit BOM'))
    },
  })
}

export interface ProjectBomSubmitInput {
  projectId: string
  s3Key: string
  filename: string
  wrongEntryResolutions: WrongEntryResolution[]
  productMatchResolutions: ProductMatchResolution[]
}

export function useSubmitProjectBomUpload(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectBomSubmitInput) =>
      executeGraphQL<{ submitProjectBomUpload: SubmitBomResult[] }>(SUBMIT_PROJECT_BOM_UPLOAD, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.fixtures(projectId) })
      toast.success('BOM uploaded successfully')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to submit BOM'))
    },
  })
}
