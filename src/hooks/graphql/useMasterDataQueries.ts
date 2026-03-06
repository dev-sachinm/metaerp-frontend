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
  UOM,
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
  productCategories: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'productCategories', skip, limit, activeOnly] as const,
  productCategory: (id: string) => [...masterDataKeys.all, 'productCategory', id] as const,
  customers: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'customers', skip, limit, activeOnly] as const,
  customer: (id: string) => [...masterDataKeys.all, 'customer', id] as const,
  uomList: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'uomList', skip, limit, activeOnly] as const,
  uom: (id: string) => [...masterDataKeys.all, 'uom', id] as const,
  taxList: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'taxList', skip, limit, activeOnly] as const,
  tax: (id: string) => [...masterDataKeys.all, 'tax', id] as const,
  paymentTermsList: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'paymentTermsList', skip, limit, activeOnly] as const,
  paymentTerm: (id: string) => [...masterDataKeys.all, 'paymentTerm', id] as const,
  expenseCategoriesList: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'expenseCategoriesList', skip, limit, activeOnly] as const,
  expenseCategory: (id: string) => [...masterDataKeys.all, 'expenseCategory', id] as const,
  suppliers: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'suppliers', skip, limit, activeOnly] as const,
  supplier: (id: string) => [...masterDataKeys.all, 'supplier', id] as const,
  vendors: (skip: number, limit: number, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'vendors', skip, limit, activeOnly] as const,
  vendor: (id: string) => [...masterDataKeys.all, 'vendor', id] as const,
  products: (skip: number, limit: number, categoryId?: string | null, activeOnly?: boolean) =>
    [...masterDataKeys.all, 'products', skip, limit, categoryId, activeOnly] as const,
  product: (id: string) => [...masterDataKeys.all, 'product', id] as const,
}

export function useProductCategories(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.productCategories(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ productCategories: PaginatedList<ProductCategory> }>(PRODUCT_CATEGORIES, {
        skip,
        limit,
        activeOnly,
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

export function useCustomers(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.customers(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ customers: PaginatedList<Customer> }>(CUSTOMERS, { skip, limit, activeOnly }),
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

export function useUOMList(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.uomList(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ uomList: PaginatedList<UOM> }>(UOM_LIST, { skip, limit, activeOnly }),
    staleTime: stale,
    gcTime: gc,
  })
}

export function useUOM(id: string | null) {
  return useQuery({
    queryKey: masterDataKeys.uom(id ?? ''),
    queryFn: () => executeGraphQL<{ uom: UOM | null }>(UOM, { id: id! }),
    enabled: !!id,
    staleTime: stale,
    gcTime: gc,
  })
}

export function useTaxList(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.taxList(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ taxList: PaginatedList<Tax> }>(TAX_LIST, { skip, limit, activeOnly }),
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

export function usePaymentTermsList(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.paymentTermsList(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ paymentTermsList: PaginatedList<PaymentTerm> }>(PAYMENT_TERMS_LIST, {
        skip,
        limit,
        activeOnly,
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

export function useExpenseCategoriesList(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.expenseCategoriesList(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ expenseCategoriesList: PaginatedList<ExpenseCategory> }>(
        EXPENSE_CATEGORIES_LIST,
        { skip, limit, activeOnly }
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

export function useSuppliers(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.suppliers(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ suppliers: PaginatedList<Supplier> }>(SUPPLIERS, { skip, limit, activeOnly }),
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

export function useVendors(skip = 0, limit = 100, activeOnly = true) {
  return useQuery({
    queryKey: masterDataKeys.vendors(skip, limit, activeOnly),
    queryFn: () =>
      executeGraphQL<{ vendors: PaginatedList<Vendor> }>(VENDORS, { skip, limit, activeOnly }),
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
  activeOnly = true
) {
  return useQuery({
    queryKey: masterDataKeys.products(skip, limit, categoryId ?? undefined, activeOnly),
    queryFn: () =>
      executeGraphQL<{ products: PaginatedList<Product> }>(PRODUCTS, {
        skip,
        limit,
        categoryId: categoryId ?? undefined,
        activeOnly,
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
