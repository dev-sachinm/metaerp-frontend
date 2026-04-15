export const GET_PURCHASE_ORDERS = `
  query ListPurchaseOrders(
    $page: Int
    $pageSize: Int
    $isActive: Boolean
    $poNumberContains: String
    $titleContains: String
    $poStatusContains: String
  ) {
    purchaseOrders(
      page: $page
      pageSize: $pageSize
      isActive: $isActive
      poNumberContains: $poNumberContains
      titleContains: $titleContains
      poStatusContains: $poStatusContains
    ) {
      items {
        id
        poNumber
        title
        poType
        projectId
        projectName
        fixtureId
        vendorId
        vendorName
        supplierId
        supplierName
        poSendDate
        poStatus
        costingUpdatedDate
        completedDate
        enableCosting
        sendPoEnabled
        isActive
        createdAt
        createdByUsername
      }
      total
      page
      totalPages
      hasMore
      firstPage
      lastPage
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
export const PURCHASE_ORDERS_BY_FIXTURE = `
  query PurchaseOrdersByFixture($fixtureId: String!, $poType: String, $partIds: [String!], $excludeStatuses: [String!]) {
    purchaseOrdersByFixture(fixtureId: $fixtureId, poType: $poType, partIds: $partIds, excludeStatuses: $excludeStatuses) {
      id
      poNumber
      title
      poType
      poStatus
      projectId
      vendorId
      supplierId
      poSendDate
      costingUpdatedDate
      completedDate
      enableCosting
      sendPoEnabled
      isActive
      createdAt
      lineItems {
        fixtureBomId
        drawingNumber
        quantity
        orderedQuantity
      }
    }
  }
`

export const STANDARD_PARTS_FOR_PO = `
  query StandardPartsForPo($fixtureId: String!) {
    standardPartsForPo(fixtureId: $fixtureId) {
      id
      itemCode
      productName
      productMake
      uom
      lhRh
      expectedQty
      currentStock
      openOrderQty
      orderQty
      purchaseUnitPrice
      supplierId
      supplierName
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
      enableCosting
      sendPoEnabled
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
