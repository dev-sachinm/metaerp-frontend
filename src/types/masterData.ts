/**
 * Master Data entity types (GraphQL camelCase)
 * Aligned with BACKEND_IMPLEMENTATION_STATE.md Master Data queries/mutations
 */

export interface ProductCategory {
  id: string
  categoryName: string
  parentId: string | null
  parentName?: string | null
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface Customer {
  id: string
  name: string
  code: string
  address: string | null
  contactInfo: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactMobile: string | null
  secondaryContactName: string | null
  secondaryContactEmail: string | null
  secondaryContactMobile: string | null
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface UOM {
  id: string
  code: string
  name: string
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface Tax {
  id: string
  name: string
  code: string
  ratePercent: number
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface PaymentTerm {
  id: string
  name: string
  code: string
  days: number
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  parentId?: string | null
  parentName?: string | null
  code: string
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface Supplier {
  id: string
  name: string
  code: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface Vendor {
  id: string
  name: string
  code: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

export interface Product {
  id: string
  name: string
  categoryId: string | null
  itemCode: string | null
  description: string | null
  make: string | null
  puUnitId: string | null
  stkUnitId: string | null
  puUnitName?: string | null
  stkUnitName?: string | null
  procMtd?: string | null
  locationInStore?: string | null
  quantity: number | null
  isActive: boolean
  createdBy?: string | null
  createdByUsername?: string | null
  modifiedBy?: string | null
  modifiedByUsername?: string | null
  createdAt?: string
  modifiedAt?: string
}

/** Paginated list response (all list queries) */
export interface PaginatedList<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
  firstPage: number
  lastPage: number
}
