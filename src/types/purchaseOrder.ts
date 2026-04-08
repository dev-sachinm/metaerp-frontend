export interface PurchaseOrderLineItem {
  id: string
  purchaseOrderId: string
  fixtureBomId?: string | null
  description?: string | null
  expenseCategoryId?: string | null
  miscellaneousLineItemCost?: number | null
  createdAt?: string | null
  
  // Fields from linked fixture_bom
  drawingNumber?: string | null
  bomDescription?: string | null
  quantity?: number | null
  purchaseUnitPrice?: number | null
  status?: string | null
  lhRh?: string | null
  receivedQuantity?: number | null
}

export interface POAttachment {
  id?: string | null
  s3Key: string
  filename?: string | null
  name?: string | null
  type?: string | null
  uploadedAt?: string | null
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  title: string
  poType: string
  projectId?: string | null
  projectName?: string | null
  fixtureId?: string | null
  details?: string | null
  vendorId?: string | null
  vendorName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  attachments?: string | null
  parsedAttachments?: POAttachment[] | null
  poSendDate?: string | null
  poStatus?: string | null
  costingUpdatedDate?: string | null
  completedDate?: string | null
  isActive: boolean
  lineItems: PurchaseOrderLineItem[]
  lineItemsSummary?: { totalCost: number | null; itemCount: number } | null
  createdAt?: string | null
  modifiedAt?: string | null
  createdByUsername?: string | null
}

export interface PurchaseOrderSummary {
  id: string
  poNumber: string
  title: string
  poType: string
  projectId?: string | null
  projectName?: string | null
  fixtureId?: string | null
  vendorName?: string | null
  supplierName?: string | null
  poSendDate?: string | null
  poStatus?: string | null
  costingUpdatedDate?: string | null
  completedDate?: string | null
  isActive: boolean
  createdAt?: string | null
}

/** Minimal PO shape returned by create mutations */
export interface PurchaseOrderCreateResult {
  id: string
  poNumber: string
  title: string
  poType: string
  vendorId?: string | null
  vendorName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  poStatus?: string | null
}
