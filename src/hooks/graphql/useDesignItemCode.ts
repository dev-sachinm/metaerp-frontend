import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import type { BomView, ParsedBom } from '@/types/design'
import { GET_BOM_VIEW_ITEM_CODE, PARSE_BOM_FILE_ITEM_CODE, PARSE_PROJECT_BOM_FILE_ITEM_CODE } from '@/graphql/queries/bomItemCode.queries'

export interface BomViewFilters {
  drawingNo?: string
  drawingDesc?: string
  stdPartNo?: string
  stdName?: string
  stdMake?: string
}

export function useBomView(fixtureId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['design', 'bomView', fixtureId] as const,
    queryFn: () => executeGraphQL<{ bomView: BomView | null }>(GET_BOM_VIEW_ITEM_CODE, { fixtureId: fixtureId! }),
    enabled: !!fixtureId && enabled,
    staleTime: 30 * 1000,
  })
}

/** Project-level: parse BOM — fixture identity from drawing numbers. */
export async function fetchParseProjectBomFile(projectId: string, s3Key: string) {
  const res = await executeGraphQL<{ parseProjectBomFile: ParsedBom }>(PARSE_PROJECT_BOM_FILE_ITEM_CODE, { projectId, s3Key })
  return res.parseProjectBomFile
}

/** One-shot: parse BOM from S3. Not cached — call directly. */
export async function fetchParseBomFile(fixtureId: string, s3Key: string) {
  const res = await executeGraphQL<{ parseBomFile: ParsedBom }>(PARSE_BOM_FILE_ITEM_CODE, { fixtureId, s3Key })
  return res.parseBomFile
}

