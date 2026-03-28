import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  RECEIVE_STANDARD_PARTS,
  UPDATE_MANUFACTURED_RECEIVED_QTY,
  UPDATE_MANUFACTURED_STATUS_BULK,
  UPDATE_STANDARD_PART_PURCHASE_UNIT_PRICE,
} from '@/graphql/mutations/bomReceiving.mutations'
import { designKeys } from '@/hooks/graphql/useDesign'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { toast } from 'sonner'

export function useReceiveStandardParts(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (receipts: { productId: string; receivedQty: number }[]) =>
      executeGraphQL<{ receiveStandardParts: number }>(RECEIVE_STANDARD_PARTS, { receipts }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success(`Receipt recorded (${data.receiveStandardParts} line(s) updated)`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to record receipt'))
    },
  })
}

export function useUpdateManufacturedStatusBulk(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { partIds: string[]; status: string }) =>
      executeGraphQL<{ updateManufacturedStatusBulk: number }>(UPDATE_MANUFACTURED_STATUS_BULK, {
        fixtureId,
        partIds: vars.partIds,
        status: vars.status,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success(`Updated status on ${data.updateManufacturedStatusBulk} part(s)`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update status'))
    },
  })
}

export function useUpdateManufacturedReceivedQty(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { partId: string; receivedQty: number | null }) =>
      executeGraphQL(UPDATE_MANUFACTURED_RECEIVED_QTY, {
        partId: vars.partId,
        receivedQty: vars.receivedQty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success('Received quantities saved')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to save received quantities'))
    },
  })
}

export function useUpdateStandardPartPurchaseUnitPrice(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { standardPartId: string; purchaseUnitPrice: number | null }) =>
      executeGraphQL(UPDATE_STANDARD_PART_PURCHASE_UNIT_PRICE, {
        standardPartId: vars.standardPartId,
        purchaseUnitPrice: vars.purchaseUnitPrice,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success('Unit price updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update unit price'))
    },
  })
}
