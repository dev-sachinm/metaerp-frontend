export const RECEIVE_STANDARD_PARTS = `
  mutation ReceiveStandardParts($receipts: [StandardPartReceiptInput!]!) {
    receiveStandardParts(receipts: $receipts)
  }
`

export const UPDATE_MANUFACTURED_STATUS_BULK = `
  mutation UpdateManufacturedStatusBulk($fixtureId: String!, $partIds: [String!]!, $status: String!) {
    updateManufacturedStatusBulk(fixtureId: $fixtureId, partIds: $partIds, status: $status)
  }
`

export const UPDATE_MANUFACTURED_RECEIVED_QTY = `
  mutation UpdateManufacturedReceivedQty($partId: String!, $receivedQty: Float) {
    updateManufacturedReceivedQty(partId: $partId, receivedQty: $receivedQty) {
      id
      qty
      receivedQuantity
      lhRh
      status
    }
  }
`

export const UPDATE_MANUFACTURED_QTY = `
  mutation UpdateManufacturedQty($partId: String!, $qty: Float!) {
    updateManufacturedQty(partId: $partId, qty: $qty) {
      id drawingNo qty status fixtureId
    }
  }
`

export const MARK_BOM_PARTS_RECEIVED = `
  mutation MarkBomPartsReceived($items: [BomReceiveItemInput!]!) {
    markBomPartsReceived(items: $items) {
      count
      events {
        id
        fixtureBomId
        drawingNumber
        qty
        purchaseOrderId
        invoiceNumber
        invoicePhotoS3Key
        performedAt
        note
      }
    }
  }
`

export interface BomReceiveItem {
  fixtureBomId: string
  receivedQty: number
  purchaseOrderId?: string
  invoiceNumber?: string
}

export interface BomReceivedEvent {
  id: string
  fixtureBomId: string
  drawingNumber: string
  qty: number
  purchaseOrderId?: string | null
  invoiceNumber?: string | null
  invoicePhotoS3Key?: string | null
  performedAt: string
  note: string
}

export interface BomPartsReceivedResult {
  count: number
  events: BomReceivedEvent[]
}

export const SET_INVOICE_PHOTO_S3_KEY = `
  mutation SetInvoicePhotoS3Key($eventId: String!, $s3Key: String!) {
    setInvoicePhotoS3Key(eventId: $eventId, s3Key: $s3Key) {
      id
      invoicePhotoS3Key
      invoicePhotoDownloadUrl
    }
  }
`

export const COLLECT_BY_ASSEMBLY = `
  mutation CollectByAssembly($collectedByUserId: String!, $items: [CollectByAssemblyItemInput!]!) {
    collectByAssembly(collectedByUserId: $collectedByUserId, items: $items) {
      s3Key
      downloadUrl
    }
  }
`

export const CREATE_BOM_QTY_EVENT = `
  mutation CreateBomQtyEvent($input: CreateBomQtyEventInput!) {
    createBomQtyEvent(input: $input) {
      id
      fixtureBomId
      drawingNumber
      kind
      qty
      performedByUserId
      performedByUserName
      performedAt
      note
      createdAt
    }
  }
`

export const CONFIRM_BOM_QTY_COLLECTION = `
  mutation ConfirmBomQtyCollection($eventId: String!, $confirmedByUserId: String!) {
    confirmBomQtyCollection(eventId: $eventId, confirmedByUserId: $confirmedByUserId) {
      id
      collectionConfirmedByAssembly
      confirmedByUserId
      confirmedByUserName
      confirmedAt
    }
  }
`

export const UPDATE_STANDARD_PART_PURCHASE_UNIT_PRICE = `
  mutation UpdateStandardPartPurchaseUnitPrice($standardPartId: String!, $purchaseUnitPrice: Float) {
    updateStandardPartPurchaseUnitPrice(standardPartId: $standardPartId, purchaseUnitPrice: $purchaseUnitPrice) {
      id
      purchaseUnitPrice
    }
  }
`
