export const GET_PURCHASE_ORDERS = `
  query GetPurchaseOrders($skip: Int, $limit: Int, $isActive: Boolean) {
    purchaseOrders(skip: $skip, limit: $limit, isActive: $isActive) {
      items {
        id
        poNumber
        title
        poType
        projectId
        projectName
        fixtureId
        vendorName
        supplierName
        poSendDate
        poStatus
        costingUpdatedDate
        completedDate
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

export const EXPORT_PO_LINE_ITEMS_XLSX = `
  query ExportPOLineItems($id: String!) {
    exportPurchaseOrderLineItemsXlsx(id: $id) {
      s3Key
      downloadUrl
    }
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

export const GET_PO_ATTACHMENT_DOWNLOAD_URL = `
  query GetPOAttachmentDownloadUrl($s3Key: String!) {
    getPurchaseOrderAttachmentDownloadUrl(s3Key: $s3Key) {
      downloadUrl
      filename
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
      projectName
      fixtureId
      details
      vendorId
      vendorName
      supplierId
      supplierName
      poSendDate
      poStatus
      costingUpdatedDate
      completedDate
      isActive
      createdAt
      modifiedAt
      createdByUsername
      attachments
      parsedAttachments {
        id
        s3Key
        filename
        name
        type
        uploadedAt
      }
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
      lineItemsSummary {
        totalCost
        itemCount
      }
    }
  }
`
