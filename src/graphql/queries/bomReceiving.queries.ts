export const GET_ALL_BOM_QTY_EVENTS = `
  query AllBomQtyEvents(
    $kind: String
    $drawingNumber: String
    $fixtureBomId: String
    $itemCode: String
    $skip: Int
    $limit: Int
  ) {
    bomQtyHistory(
      kind: $kind
      drawingNumber: $drawingNumber
      fixtureBomId: $fixtureBomId
      itemCode: $itemCode
      skip: $skip
      limit: $limit
    ) {
      total
      skip
      limit
      items {
        id
        fixtureBomId
        drawingNumber
        kind
        qty
        partType
        fixtureName
        itemCode
        productName
        performedByUserId
        performedByUserName
        performedAt
        note
        purchaseOrderId
        invoiceNumber
        invoicePhotoS3Key
        invoicePhotoDownloadUrl
        collectionConfirmedByAssembly
        confirmedByUserId
        confirmedByUserName
        confirmedAt
        createdBy
        createdAt
      }
    }
  }
`

export const GET_INVOICE_PHOTO_DOWNLOAD_URL = `
  query GetInvoicePhotoDownloadUrl($eventId: String!) {
    getInvoicePhotoDownloadUrl(eventId: $eventId) {
      eventId
      s3Key
      downloadUrl
    }
  }
`

export const GET_INVOICE_PHOTO_UPLOAD_URL = `
  query GetInvoicePhotoUploadUrl($eventId: String!, $filename: String!) {
    getInvoicePhotoUploadUrl(eventId: $eventId, filename: $filename) {
      eventId
      s3Key
      uploadUrl
    }
  }
`

export const GET_BOM_QTY_HISTORY = `
  query BomQtyHistory(
    $drawingNumber: String,
    $fixtureBomId: String,
    $itemCode: String,
    $kind: String,
    $skip: Int,
    $limit: Int
  ) {
    bomQtyHistory(
      drawingNumber: $drawingNumber,
      fixtureBomId: $fixtureBomId,
      itemCode: $itemCode,
      kind: $kind,
      skip: $skip,
      limit: $limit
    ) {
      total
      skip
      limit
      items {
        id
        fixtureBomId
        drawingNumber
        kind
        qty
        performedByUserId
        performedByUserName
        performedAt
        note
        collectionConfirmedByAssembly
        confirmedByUserId
        confirmedByUserName
        confirmedAt
        createdBy
        createdAt
        itemCode
        productName
        currentStock
        partType
        fixtureName
      }
    }
  }
`
