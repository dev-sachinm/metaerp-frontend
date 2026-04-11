import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  CREATE_MANUFACTURED_PO,
  CREATE_STANDARD_PO,
  CREATE_PURCHASE_ORDER,
  UPDATE_PURCHASE_ORDER,
  DELETE_PURCHASE_ORDER,
} from '@/graphql/mutations/purchaseOrder.mutations'
import { designKeys } from '@/hooks/graphql/useDesign'
import { poKeys } from '@/hooks/graphql/usePurchaseOrderQueries'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import type { PurchaseOrderCreateResult, StandardPoPartInput } from '@/types/purchaseOrder'
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
    mutationFn: (vars: { parts: StandardPoPartInput[]; supplierId: string }) =>
      executeGraphQL<{ createStandardPo: PurchaseOrderCreateResult }>(CREATE_STANDARD_PO, {
        fixtureId,
        parts: vars.parts,
        supplierId: vars.supplierId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      queryClient.invalidateQueries({ queryKey: poKeys.byFixture(fixtureId, 'StandardPart') })
      queryClient.invalidateQueries({ queryKey: poKeys.standardPartsForPo(fixtureId) })
      const po = data.createStandardPo
      toast.success(`Standard PO created: ${po.poNumber}`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create standard PO'))
    },
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: any) =>
      executeGraphQL<{ createPurchaseOrder: PurchaseOrderCreateResult }>(CREATE_PURCHASE_ORDER, { input }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: poKeys.lists() })
      toast.success(`Purchase Order created: ${data.createPurchaseOrder.poNumber}`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create purchase order'))
    },
  })
}

export function useUpdatePurchaseOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: any) =>
      executeGraphQL<{ updatePurchaseOrder: PurchaseOrderCreateResult }>(UPDATE_PURCHASE_ORDER, { id, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: poKeys.lists() })
      toast.success('Purchase order updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update purchase order'))
    },
  })
}

export function useTogglePOCosting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enableCosting }: { id: string; enableCosting: boolean }) =>
      executeGraphQL<{ updatePurchaseOrder: PurchaseOrderCreateResult }>(UPDATE_PURCHASE_ORDER, {
        id,
        input: { enableCosting },
      }),
    onSuccess: (_, { enableCosting }) => {
      queryClient.invalidateQueries({ queryKey: poKeys.lists() })
      toast.success(`Costing ${enableCosting ? 'enabled' : 'disabled'}`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update costing flag'))
    },
  })
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => executeGraphQL<{ deletePurchaseOrder: boolean }>(DELETE_PURCHASE_ORDER, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poKeys.lists() })
      toast.success('Purchase order deleted')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete purchase order'))
    },
  })
}
