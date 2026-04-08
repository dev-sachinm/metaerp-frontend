import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { PARSE_COSTING_EXCEL, CONFIRM_COSTING } from '@/graphql/mutations/costing.mutations'
import { poKeys } from '@/hooks/graphql/usePurchaseOrderQueries'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { toast } from 'sonner'

export interface CostingRow {
  drawingNumber: string
  purchaseUnitPrice: number | string | null
  quantity: number | string | null
  totalCost: number | string | null
  matched: boolean
}

export interface CostingPreview {
  s3Key: string
  rows: CostingRow[]
  unmatchedDrawingNumbers: string[]
}

export interface ConfirmCostingResult {
  poId: string
  updatedCount: number
}

export function useParseCostingExcel() {
  return useMutation({
    mutationFn: (vars: { poId: string; fileBase64: string; filename: string }) =>
      executeGraphQL<{ parseCostingExcel: CostingPreview }>(PARSE_COSTING_EXCEL, vars),
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to parse costing file'))
    },
  })
}

export function useConfirmCosting(poId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (s3Key: string) =>
      executeGraphQL<{ confirmCosting: ConfirmCostingResult }>(CONFIRM_COSTING, { poId, s3Key }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: poKeys.detail(poId) })
      toast.success(`Costing applied: ${data.confirmCosting.updatedCount} rows updated`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to confirm costing'))
    },
  })
}
