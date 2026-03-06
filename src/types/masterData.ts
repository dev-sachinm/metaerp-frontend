/**
 * Master Data entity types (GraphQL camelCase)
 * Aligned with BACKEND_IMPLEMENTATION_STATE.md Master Data queries/mutations
 */

export interface ProductCategory {
  id: string
  categoryName: string
  parentId: string | null
  isActive: boolean
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
  createdAt?: string
  modifiedAt?: string
}

export interface UOM {
  id: string
  code: string
  name: string
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface Tax {
  id: string
  name: string
  code: string
  ratePercent: number
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface PaymentTerm {
  id: string
  name: string
  code: string
  days: number
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface Supplier {
  id: string
  name: string
  code: string
  contactInfo: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface Vendor {
  id: string
  name: string
  code: string
  contactInfo: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface Product {
  id: string
  name: string
  categoryId: string | null
  partNo: string | null
  description: string | null
  make: string | null
  unitId: string | null
  initialStock: number | null
  isActive: boolean
  createdAt?: string
  modifiedAt?: string
}

/** Paginated list response (all list queries) */
export interface PaginatedList<T> {
  items: T[]
  total: number
  skip: number
  limit: number
  page: number
  totalPages: number
  hasMore: boolean
}
