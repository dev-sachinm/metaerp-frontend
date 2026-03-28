/**
 * Master Data React Query hooks (list + single)
 * Require master_data module enabled. Uses executeGraphQL.
 */

import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY,
  CUSTOMERS,
  CUSTOMER,
  UOM_LIST,
  UOM as UOM_QUERY,
  TAX_LIST,
  TAX,
  PAYMENT_TERMS_LIST,
  PAYMENT_TERM,
  EXPENSE_CATEGORIES_LIST,
  EXPENSE_CATEGORY,
  SUPPLIERS,
  SUPPLIER,
  VENDORS,
  VENDOR,
  PRODUCTS,
  PRODUCT,
} from '@/graphql/queries/masterData.queries'
import type {
  ProductCategory,
  Customer,
  UOM,
  Tax,
  PaymentTerm,
  ExpenseCategory,
  Supplier,
  Vendor,
  Product,
  PaginatedList,
} from '@/types/masterData'

const stale = 5 * 60 * 1000
const gc = 30 * 60 * 1000


// ── Per-entity filter interfaces ─────────────────────────────────────────────
export interface ProductCategoryFilters { nameContains?: string; parentId?: string; isActive?: boolean }
export interface CustomerFilters { nameContains?: string; codeContains?: string; contactNameContains?: string; emailContains?: string; isActive?: boolean }
export interface UOMFilters { searchContains?: string; isActive?: boolean }
export interface TaxFilters { nameContains?: string; codeContains?: string; rateMin?: number; rateMax?: number; isActive?: boolean }
export interface PaymentTermFilters { nameContains?: string; codeContains?: string; daysMin?: number; daysMax?: number; isActive?: boolean }
export interface ExpenseCategoryFilters { nameContains?: string; codeContains?: string; parentId?: string; isActive?: boolean }
export interface SupplierFilters { nameContains?: string; codeContains?: string; contactPersonContains?: string; emailContains?: string; isActive?: boolean }
export interface VendorFilters { nameContains?: string; codeContains?: string; contactPersonContains?: string; emailContains?: string; isActive?: boolean }

export const masterDataKeys = {
  all: ['masterData'] as const,
  productCategories: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'productCategories', page, pageSize, isActive] as const,
  productCategory: (id: string) => [...masterDataKeys.all, 'productCategory', id] as const,
  customers: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'customers', page, pageSize, isActive] as const,
  customer: (id: string) => [...masterDataKeys.all, 'customer', id] as const,
  uomList: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'uomList', page, pageSize, isActive] as const,
  uom: (id: string) => [...masterDataKeys.all, 'uom', id] as const,
  taxList: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'taxList', page, pageSize, isActive] as const,
  tax: (id: string) => [...masterDataKeys.all, 'tax', id] as const,
  paymentTermsList: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'paymentTermsList', page, pageSize, isActive] as const,
  paymentTerm: (id: string) => [...masterDataKeys.all, 'paymentTerm', id] as const,
  expenseCategoriesList: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'expenseCategoriesList', page, pageSize, isActive] as const,
  expenseCategory: (id: string) => [...masterDataKeys.all, 'expenseCategory', id] as const,
  suppliers: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'suppliers', page, pageSize, isActive] as const,
  supplier: (id: string) => [...masterDataKeys.all, 'supplier', id] as const,
  vendors: (page: number, pageSize: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'vendors', page, pageSize, isActive] as const,
  vendor: (id: string) => [...masterDataKeys.all, 'vendor', id] as const,
  products: (page: number, pageSize: number, categoryId?: string | null, isActive?: boolean, itemCodeContains?: string, nameContains?: string) =>
    [...masterDataKeys.all, 'products', page, pageSize, categoryId, isActive, itemCodeContains, nameContains] as const,
  product: (id: string) => [...masterDataKeys.all, 'product', id] as const,
}

export function useProductCategories(page = 1, pageSize = 20, filters: ProductCategoryFilters = {}) {
  const { isActive, nameContains, parentId } = filters
  return useQuery({
    queryKey: [...masterDataKeys.productCategories(page, pageSize, isActive), nameContains, parentId],
    queryFn: () =>
      executeGraphQL<{ productCategories: PaginatedList<ProductCategory> }>(PRODUCT_CATEGORIES, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        parentId: parentId || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useProductCategory(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.productCategory(id ?? ''),
    queryFn: () => executeGraphQL<{ productCategory: ProductCategory | null }>(PRODUCT_CATEGORY, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useCustomers(page = 1, pageSize = 20, filters: CustomerFilters = {}) {
  const { isActive, nameContains, codeContains, contactNameContains, emailContains } = filters
  return useQuery({
    queryKey: [...masterDataKeys.customers(page, pageSize, isActive), nameContains, codeContains, contactNameContains, emailContains],
    queryFn: () =>
      executeGraphQL<{ customers: PaginatedList<Customer> }>(CUSTOMERS, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        contactNameContains: contactNameContains || undefined,
        emailContains: emailContains || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.customer(id ?? ''),
    queryFn: () => executeGraphQL<{ customer: Customer | null }>(CUSTOMER, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useUOMList(page = 1, pageSize = 20, filters: UOMFilters = {}) {
  const { isActive, searchContains } = filters
  return useQuery({
    queryKey: [...masterDataKeys.uomList(page, pageSize, isActive), searchContains],
    queryFn: () =>
      executeGraphQL<{ uomList: PaginatedList<UOM> }>(UOM_LIST, {
        page, pageSize, isActive,
        searchContains: searchContains || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useUOM(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.uom(id ?? ''),
    queryFn: () => executeGraphQL<{ uom: UOM | null }>(UOM_QUERY, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useTaxList(page = 1, pageSize = 20, filters: TaxFilters = {}) {
  const { isActive, nameContains, codeContains, rateMin, rateMax } = filters
  return useQuery({
    queryKey: [...masterDataKeys.taxList(page, pageSize, isActive), nameContains, codeContains, rateMin, rateMax],
    queryFn: () =>
      executeGraphQL<{ taxList: PaginatedList<Tax> }>(TAX_LIST, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        rateMin: rateMin || undefined,
        rateMax: rateMax || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useTax(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.tax(id ?? ''),
    queryFn: () => executeGraphQL<{ tax: Tax | null }>(TAX, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function usePaymentTermsList(page = 1, pageSize = 20, filters: PaymentTermFilters = {}) {
  const { isActive, nameContains, codeContains, daysMin, daysMax } = filters
  return useQuery({
    queryKey: [...masterDataKeys.paymentTermsList(page, pageSize, isActive), nameContains, codeContains, daysMin, daysMax],
    queryFn: () =>
      executeGraphQL<{ paymentTermsList: PaginatedList<PaymentTerm> }>(PAYMENT_TERMS_LIST, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        daysMin: daysMin || undefined,
        daysMax: daysMax || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function usePaymentTerm(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.paymentTerm(id ?? ''),
    queryFn: () =>
      executeGraphQL<{ paymentTerm: PaymentTerm | null }>(PAYMENT_TERM, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useExpenseCategoriesList(page = 1, pageSize = 20, filters: ExpenseCategoryFilters = {}) {
  const { isActive, nameContains, codeContains, parentId } = filters
  return useQuery({
    queryKey: [...masterDataKeys.expenseCategoriesList(page, pageSize, isActive), nameContains, codeContains, parentId],
    queryFn: () =>
      executeGraphQL<{ expenseCategoriesList: PaginatedList<ExpenseCategory> }>(EXPENSE_CATEGORIES_LIST, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        parentId: parentId || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useExpenseCategory(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.expenseCategory(id ?? ''),
    queryFn: () =>
      executeGraphQL<{ expenseCategory: ExpenseCategory | null }>(EXPENSE_CATEGORY, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useSuppliers(page = 1, pageSize = 20, filters: SupplierFilters = {}) {
  const { isActive, nameContains, codeContains, contactPersonContains, emailContains } = filters
  return useQuery({
    queryKey: [...masterDataKeys.suppliers(page, pageSize, isActive), nameContains, codeContains, contactPersonContains, emailContains],
    queryFn: () =>
      executeGraphQL<{ suppliers: PaginatedList<Supplier> }>(SUPPLIERS, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        contactPersonContains: contactPersonContains || undefined,
        emailContains: emailContains || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.supplier(id ?? ''),
    queryFn: () => executeGraphQL<{ supplier: Supplier | null }>(SUPPLIER, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useVendors(page = 1, pageSize = 20, filters: VendorFilters = {}) {
  const { isActive, nameContains, codeContains, contactPersonContains, emailContains } = filters
  return useQuery({
    queryKey: [...masterDataKeys.vendors(page, pageSize, isActive), nameContains, codeContains, contactPersonContains, emailContains],
    queryFn: () =>
      executeGraphQL<{ vendors: PaginatedList<Vendor> }>(VENDORS, {
        page, pageSize, isActive,
        nameContains: nameContains || undefined,
        codeContains: codeContains || undefined,
        contactPersonContains: contactPersonContains || undefined,
        emailContains: emailContains || undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useVendor(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.vendor(id ?? ''),
    queryFn: () => executeGraphQL<{ vendor: Vendor | null }>(VENDOR, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export interface ProductsFilters {
  categoryId?: string | null
  isActive?: boolean
  itemCodeContains?: string
  nameContains?: string
  descriptionContains?: string
  makeContains?: string
  puUnitId?: string
  stkUnitId?: string
  locationInStoreContains?: string
}

export function useProducts(
  page = 1,
  pageSize = 20,
  filters: ProductsFilters = {}
) {
  const { categoryId, isActive, itemCodeContains, nameContains, descriptionContains, makeContains, puUnitId, stkUnitId, locationInStoreContains } = filters
  return useQuery({
    queryKey: masterDataKeys.products(page, pageSize, categoryId, isActive, itemCodeContains, nameContains),
    queryFn: () =>
      executeGraphQL<{ products: PaginatedList<Product> }>(PRODUCTS, {
        page,
        pageSize,
        categoryId: categoryId ?? undefined,
        isActive,
        itemCodeContains: itemCodeContains ?? undefined,
        nameContains: nameContains ?? undefined,
        descriptionContains: descriptionContains ?? undefined,
        makeContains: makeContains ?? undefined,
        puUnitId: puUnitId ?? undefined,
        stkUnitId: stkUnitId ?? undefined,
        locationInStoreContains: locationInStoreContains ?? undefined,
      }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.product(id ?? ''),
    queryFn: () => executeGraphQL<{ product: Product | null }>(PRODUCT, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}
