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
