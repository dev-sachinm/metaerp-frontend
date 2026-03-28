import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { CREATE_MANUFACTURED_PO, CREATE_STANDARD_PO } from '@/graphql/mutations/purchaseOrder.mutations'
import { designKeys } from '@/hooks/graphql/useDesign'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import type { PurchaseOrderCreateResult } from '@/types/purchaseOrder'
import { toast } from 'sonner'

export function useCreateManufacturedPo(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { partIds: string[]; vendorId: string }) =>
      executeGraphQL<{ createManufacturedPo: PurchaseOrderCreateResult }>(CREATE_MANUFACTURED_PO, {
        fixtureId,
        partIds: vars.partIds,
        vendorId: vars.vendorId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      const po = data.createManufacturedPo
      toast.success(`Manufacturing PO created: ${po.poNumber}`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create manufacturing PO'))
    },
  })
}

export function useCreateStandardPo(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { partIds: string[]; supplierId: string }) =>
      executeGraphQL<{ createStandardPo: PurchaseOrderCreateResult }>(CREATE_STANDARD_PO, {
        fixtureId,
        partIds: vars.partIds,
        supplierId: vars.supplierId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      const po = data.createStandardPo
      toast.success(`Standard PO created: ${po.poNumber}`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create standard PO'))
    },
  })
}
