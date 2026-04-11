import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  RECEIVE_STANDARD_PARTS,
  UPDATE_MANUFACTURED_QTY,
  UPDATE_MANUFACTURED_RECEIVED_QTY,
  UPDATE_MANUFACTURED_STATUS_BULK,
  UPDATE_STANDARD_PART_PURCHASE_UNIT_PRICE,
  MARK_BOM_PARTS_RECEIVED,
  COLLECT_BY_ASSEMBLY,
} from '@/graphql/mutations/bomReceiving.mutations'
import { GET_USERS_BY_ROLE_NAME } from '@/graphql/queries/users.queries'
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

export function useUpdateManufacturedQty(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { partId: string; qty: number }) =>
      executeGraphQL(UPDATE_MANUFACTURED_QTY, { partId: vars.partId, qty: vars.qty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      toast.success('Quantity updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update quantity'))
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

export interface AssemblyUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
}

export function useAssemblyUsers(enabled = true) {
  return useQuery({
    queryKey: ['users', 'assembly'] as const,
    queryFn: () =>
      executeGraphQL<{ users: { items: AssemblyUser[]; total: number } }>(
        GET_USERS_BY_ROLE_NAME,
        { roleName: 'Assembly', limit: 200 },
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMarkBomPartsReceived(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: { fixtureBomId: string; receivedQty: number }[]) =>
      executeGraphQL<{ markBomPartsReceived: number }>(MARK_BOM_PARTS_RECEIVED, { items }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      queryClient.invalidateQueries({ queryKey: ['design', 'bomView', fixtureId] })
      toast.success(`Received quantity updated for ${data.markBomPartsReceived} item(s)`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update received quantities'))
    },
  })
}

export function useCollectByAssembly(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      collectedByUserId: string
      items: { fixtureBomId: string; collectedQuantity: number }[]
    }) =>
      executeGraphQL<{
        collectByAssembly: { s3Key: string; downloadUrl: string }
      }>(COLLECT_BY_ASSEMBLY, {
        collectedByUserId: vars.collectedByUserId,
        items: vars.items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      queryClient.invalidateQueries({ queryKey: ['design', 'bomView', fixtureId] })
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to collect by assembly'))
    },
  })
}
