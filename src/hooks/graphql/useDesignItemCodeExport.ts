import { useMutation } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { toast } from 'sonner'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { EXPORT_BOM_VIEW_EXCEL_ITEM_CODE } from '@/graphql/mutations/bomItemCode.mutations'

export function useExportBomViewExcelItemCode() {
  return useMutation({
    mutationFn: (vars: {
      fixtureId: string
      drawingNoContains?: string | null
      drawingDescriptionContains?: string | null
      standardPartItemCodeContains?: string | null
      standardPartNameContains?: string | null
      standardPartMakeContains?: string | null
    }) =>
      executeGraphQL<{ exportBomViewExcel: { s3Key: string; downloadUrl: string } }>(EXPORT_BOM_VIEW_EXCEL_ITEM_CODE, {
        fixtureId: vars.fixtureId,
        drawingNoContains: vars.drawingNoContains ?? null,
        drawingDescriptionContains: vars.drawingDescriptionContains ?? null,
        standardPartItemCodeContains: vars.standardPartItemCodeContains ?? null,
        standardPartNameContains: vars.standardPartNameContains ?? null,
        standardPartMakeContains: vars.standardPartMakeContains ?? null,
      }),
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to export BOM Excel'))
    },
  })
}

