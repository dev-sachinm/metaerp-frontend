export const GET_PURCHASE_ORDERS = `
  query GetPurchaseOrders($skip: Int, $limit: Int, $isActive: Boolean) {
    purchaseOrders(skip: $skip, limit: $limit, isActive: $isActive) {
      items {
        id
        poNumber
        title
        poType
        projectId
        vendorName
        supplierName
        poSendDate
        poStatus
        isActive
        createdAt
      }
      total
      skip
      limit
      page
      totalPages
      hasMore
    }
  }
`

export const EXPORT_PO_LINE_ITEMS_CSV = `
  query ExportPOLineItems($id: String!) {
    exportPurchaseOrderLineItemsCsv(id: $id)
  }
`

export const GET_PO_ATTACHMENT_UPLOAD_URL = `
  query GetPurchaseOrderAttachmentUploadUrl($poId: String!, $filename: String!) {
    getPurchaseOrderAttachmentUploadUrl(poId: $poId, filename: $filename) {
      uploadUrl
      s3Key
      poId
    }
  }
`
export const GET_PURCHASE_ORDER = `
  query GetPurchaseOrder($id: String!) {
    purchaseOrder(id: $id) {
      id
      poNumber
      title
      poType
      projectId
      details
      vendorId
      vendorName
      supplierId
      supplierName
      poSendDate
      poStatus
      isActive
      createdAt
      createdByUsername
      attachments
      lineItems {
        id
        purchaseOrderId
        fixtureBomId
        description
        expenseCategoryId
        miscellaneousLineItemCost
        createdAt
        drawingNumber
        bomDescription
        quantity
        purchaseUnitPrice
        status
        lhRh
        receivedQuantity
      }
    }
  }
`
