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

export interface PurchaseOrder {
  id: string
  poNumber: string
  title: string
  poType: string
  projectId?: string | null
  details?: string | null
  vendorId?: string | null
  vendorName?: string | null
  supplierId?: string | null
  supplierName?: string | null
  attachments?: string | null
  poSendDate?: string | null
  poStatus?: string | null
  isActive: boolean
  lineItems: PurchaseOrderLineItem[]
  createdAt?: string | null
  createdByUsername?: string | null
}

export interface PurchaseOrderSummary {
  id: string
  poNumber: string
  title: string
  poType: string
  projectId?: string | null
  vendorName?: string | null
  supplierName?: string | null
  poSendDate?: string | null
  poStatus?: string | null
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
