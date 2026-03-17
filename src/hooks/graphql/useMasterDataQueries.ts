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

export const masterDataKeys = {
  all: ['masterData'] as const,
  productCategories: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'productCategories', skip, limit, isActive] as const,
  productCategory: (id: string) => [...masterDataKeys.all, 'productCategory', id] as const,
  customers: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'customers', skip, limit, isActive] as const,
  customer: (id: string) => [...masterDataKeys.all, 'customer', id] as const,
  uomList: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'uomList', skip, limit, isActive] as const,
  uom: (id: string) => [...masterDataKeys.all, 'uom', id] as const,
  taxList: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'taxList', skip, limit, isActive] as const,
  tax: (id: string) => [...masterDataKeys.all, 'tax', id] as const,
  paymentTermsList: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'paymentTermsList', skip, limit, isActive] as const,
  paymentTerm: (id: string) => [...masterDataKeys.all, 'paymentTerm', id] as const,
  expenseCategoriesList: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'expenseCategoriesList', skip, limit, isActive] as const,
  expenseCategory: (id: string) => [...masterDataKeys.all, 'expenseCategory', id] as const,
  suppliers: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'suppliers', skip, limit, isActive] as const,
  supplier: (id: string) => [...masterDataKeys.all, 'supplier', id] as const,
  vendors: (skip: number, limit: number, isActive?: boolean) =>
    [...masterDataKeys.all, 'vendors', skip, limit, isActive] as const,
  vendor: (id: string) => [...masterDataKeys.all, 'vendor', id] as const,
  products: (skip: number, limit: number, categoryId?: string | null, isActive?: boolean) =>
    [...masterDataKeys.all, 'products', skip, limit, categoryId, isActive] as const,
  product: (id: string) => [...masterDataKeys.all, 'product', id] as const,
}

export function useProductCategories(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.productCategories(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ productCategories: PaginatedList<ProductCategory> }>(PRODUCT_CATEGORIES, {
        skip,
        limit,
        isActive,
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

export function useCustomers(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.customers(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ customers: PaginatedList<Customer> }>(CUSTOMERS, { skip, limit, isActive }),
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

export function useUOMList(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.uomList(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ uomList: PaginatedList<UOM> }>(UOM_LIST, { skip, limit, isActive }),
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

export function useTaxList(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.taxList(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ taxList: PaginatedList<Tax> }>(TAX_LIST, { skip, limit, isActive }),
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

export function usePaymentTermsList(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.paymentTermsList(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ paymentTermsList: PaginatedList<PaymentTerm> }>(PAYMENT_TERMS_LIST, {
        skip,
        limit,
        isActive,
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

export function useExpenseCategoriesList(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.expenseCategoriesList(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ expenseCategoriesList: PaginatedList<ExpenseCategory> }>(
        EXPENSE_CATEGORIES_LIST,
        { skip, limit, isActive }
      ),
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

export function useSuppliers(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.suppliers(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ suppliers: PaginatedList<Supplier> }>(SUPPLIERS, { skip, limit, isActive }),
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

export function useVendors(skip = 0, limit = 100, isActive?: boolean) {
  return useQuery({
    queryKey: masterDataKeys.vendors(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ vendors: PaginatedList<Vendor> }>(VENDORS, { skip, limit, isActive }),
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

export function useProducts(
  skip = 0,
  limit = 100,
  categoryId?: string | null,
  isActive?: boolean
) {
  return useQuery({
    queryKey: masterDataKeys.products(skip, limit, categoryId ?? undefined, isActive),
    queryFn: () =>
      executeGraphQL<{ products: PaginatedList<Product> }>(PRODUCTS, {
        skip,
        limit,
        categoryId: categoryId ?? undefined,
        isActive,
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
