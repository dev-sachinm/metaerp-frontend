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
  CREATE_BOM_QTY_EVENT,
  CONFIRM_BOM_QTY_COLLECTION,
  SET_INVOICE_PHOTO_S3_KEY,
  type BomReceiveItem,
  type BomPartsReceivedResult,
} from '@/graphql/mutations/bomReceiving.mutations'
import {
  GET_BOM_QTY_HISTORY,
  GET_ALL_BOM_QTY_EVENTS,
  GET_INVOICE_PHOTO_UPLOAD_URL,
} from '@/graphql/queries/bomReceiving.queries'
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

export interface BomQtyEvent {
  id: string
  fixtureBomId: string
  drawingNumber: string
  kind: string
  qty: number
  performedByUserId: string
  performedByUserName: string
  performedAt: string
  note: string
  collectionConfirmedByAssembly?: boolean | null
  confirmedByUserId?: string | null
  confirmedByUserName?: string | null
  confirmedAt?: string | null
  createdBy?: string | null
  createdAt: string
  itemCode?: string | null
  productName?: string | null
  currentStock?: number | null
  partType?: string | null
  fixtureName?: string | null
  purchaseOrderId?: string | null
  invoiceNumber?: string | null
  invoicePhotoS3Key?: string | null
  invoicePhotoDownloadUrl?: string | null
}

export interface BomQtyEventList {
  total: number
  skip: number
  limit: number
  items: BomQtyEvent[]
}

export interface CreateBomQtyEventInput {
  fixtureBomId: string
  kind: 'RECEIVE' | 'COLLECT'
  qty: number
  performedByUserId: string
  note: 'RECEIVED_AT_STORE' | 'COLLECTED_BY_ASSEMBLY' | 'MANUAL_ADJUSTMENT'
  performedAt?: string
}

export interface BomQtyHistoryFilter {
  drawingNumber?: string | null
  fixtureBomId?: string | null
  itemCode?: string | null
}

export function useBomQtyHistory(
  filter: BomQtyHistoryFilter,
  kind: 'receive' | 'collect' | null,
  limit: number,
  enabled: boolean,
) {
  const hasFilter = !!(filter.drawingNumber || filter.fixtureBomId || filter.itemCode)
  return useQuery({
    queryKey: [
      'bomQtyHistory',
      filter.drawingNumber ?? null,
      filter.fixtureBomId ?? null,
      filter.itemCode ?? null,
      kind,
      limit,
    ] as const,
    queryFn: () =>
      executeGraphQL<{ bomQtyHistory: BomQtyEventList }>(GET_BOM_QTY_HISTORY, {
        drawingNumber: filter.drawingNumber ?? undefined,
        fixtureBomId: filter.fixtureBomId ?? undefined,
        itemCode: filter.itemCode ?? undefined,
        kind,
        skip: 0,
        limit,
      }),
    enabled: enabled && hasFilter,
    staleTime: 30 * 1000,
  })
}

export function useCreateBomQtyEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBomQtyEventInput) =>
      executeGraphQL<{ createBomQtyEvent: BomQtyEvent }>(CREATE_BOM_QTY_EVENT, { input }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['bomQtyHistory', _data.createBomQtyEvent.drawingNumber] })
      queryClient.invalidateQueries({ queryKey: ['bomQtyHistory'] })
      toast.success(`${vars.kind === 'RECEIVE' ? 'Receive' : 'Collect'} event recorded`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to record event'))
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
        { roleName: 'Assembly' },
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export interface AllBomQtyEventsFilter {
  kind?: 'receive' | 'collect' | null
  drawingNumber?: string | null
  fixtureBomId?: string | null
  itemCode?: string | null
}

export function useAllBomQtyEvents(
  filter: AllBomQtyEventsFilter,
  skip: number,
  limit: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'bomQtyEvents',
      'all',
      filter.kind ?? null,
      filter.drawingNumber ?? null,
      filter.fixtureBomId ?? null,
      filter.itemCode ?? null,
      skip,
      limit,
    ] as const,
    queryFn: () =>
      executeGraphQL<{ bomQtyHistory: BomQtyEventList }>(GET_ALL_BOM_QTY_EVENTS, {
        kind: filter.kind ?? undefined,
        drawingNumber: filter.drawingNumber?.trim() || undefined,
        fixtureBomId: filter.fixtureBomId ?? undefined,
        itemCode: filter.itemCode?.trim() || undefined,
        skip,
        limit,
      }),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useMarkBomPartsReceived(fixtureId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: BomReceiveItem[]) =>
      executeGraphQL<{ markBomPartsReceived: BomPartsReceivedResult }>(MARK_BOM_PARTS_RECEIVED, { items }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designKeys.bomView(fixtureId) })
      queryClient.invalidateQueries({ queryKey: ['design', 'bomView', fixtureId] })
      toast.success(`Received quantity updated for ${data.markBomPartsReceived.count} item(s)`)
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update received quantities'))
    },
  })
}

/**
 * Full invoice-photo upload flow for one batch of receive events (one photo, N events):
 *   Step 1 — getInvoicePhotoUploadUrl(eventId, filename)  → { s3Key, uploadUrl }
 *   Step 2 — PUT image bytes to uploadUrl                 (direct S3, no server)
 *   Step 3 — setInvoicePhotoS3Key(eventId, s3Key)         → persists key on event row
 */
export async function uploadInvoicePhoto(
  eventIds: string[],
  imageBlob: Blob,
  filename: string,
): Promise<void> {
  for (const eventId of eventIds) {
    // Step 1: get presigned PUT URL + the S3 key we will persist
    const { getInvoicePhotoUploadUrl: urlData } = await executeGraphQL<{
      getInvoicePhotoUploadUrl: { s3Key: string; uploadUrl: string }
    }>(GET_INVOICE_PHOTO_UPLOAD_URL, { eventId, filename })

    // Step 2: PUT image bytes directly to S3 (no auth header — presigned URL)
    const putRes = await fetch(urlData.uploadUrl, {
      method: 'PUT',
      body: imageBlob,
      headers: { 'Content-Type': imageBlob.type || 'image/jpeg' },
    })
    if (!putRes.ok) throw new Error(`S3 upload failed: ${putRes.status}`)

    // Step 3: save the S3 key on the event row
    await executeGraphQL<{
      setInvoicePhotoS3Key: { id: string; invoicePhotoS3Key: string; invoicePhotoDownloadUrl: string | null }
    }>(SET_INVOICE_PHOTO_S3_KEY, { eventId, s3Key: urlData.s3Key })
  }
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

export interface ConfirmBomQtyCollectionResult {
  id: string
  collectionConfirmedByAssembly: boolean
  confirmedByUserId: string
  confirmedByUserName: string
  confirmedAt: string
}

export function useConfirmBomQtyCollection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { eventId: string; confirmedByUserId: string }) =>
      executeGraphQL<{ confirmBomQtyCollection: ConfirmBomQtyCollectionResult }>(
        CONFIRM_BOM_QTY_COLLECTION,
        vars,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bomQtyHistory'] })
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to confirm collection'))
    },
  })
}
