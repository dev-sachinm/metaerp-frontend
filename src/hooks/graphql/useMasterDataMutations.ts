/**
 * Master Data mutations (create/update/delete) with cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import { toast } from 'sonner'
import { isPermissionError, getErrorMessage } from '@/lib/graphqlErrors'
import {
  CREATE_PRODUCT_CATEGORY,
  UPDATE_PRODUCT_CATEGORY,
  DELETE_PRODUCT_CATEGORY,
  CREATE_CUSTOMER,
  UPDATE_CUSTOMER,
  DELETE_CUSTOMER,
  CREATE_UOM,
  UPDATE_UOM,
  DELETE_UOM,
  CREATE_TAX,
  UPDATE_TAX,
  DELETE_TAX,
  CREATE_PAYMENT_TERM,
  UPDATE_PAYMENT_TERM,
  DELETE_PAYMENT_TERM,
  CREATE_EXPENSE_CATEGORY,
  UPDATE_EXPENSE_CATEGORY,
  DELETE_EXPENSE_CATEGORY,
  CREATE_SUPPLIER,
  UPDATE_SUPPLIER,
  DELETE_SUPPLIER,
  CREATE_VENDOR,
  UPDATE_VENDOR,
  DELETE_VENDOR,
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  DELETE_PRODUCT,
} from '@/graphql/mutations/masterData.mutations'
import { masterDataKeys } from './useMasterDataQueries'

/** Input types for mutations (GraphQL input shape) */
export interface ProductCategoryInput {
  categoryName: string
  parentId?: string | null
  isActive?: boolean
}
export interface CustomerInput {
  name: string
  code: string
  address?: string | null
  contactInfo?: string | null
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  primaryContactMobile?: string | null
  secondaryContactName?: string | null
  secondaryContactEmail?: string | null
  secondaryContactMobile?: string | null
  isActive?: boolean
}
export interface UOMInput {
  code: string
  name: string
  isActive?: boolean
}
export interface TaxInput {
  name: string
  code: string
  ratePercent: number
  isActive?: boolean
}
export interface PaymentTermInput {
  name: string
  code: string
  days: number
  isActive?: boolean
}
export interface ExpenseCategoryInput {
  name: string
  parentId?: string | null
  code: string
  isActive?: boolean
}
export interface SupplierInput {
  name: string
  code: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive?: boolean
}
export interface VendorInput {
  name: string
  code: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive?: boolean
}
/** Public-facing input (uses doc field names partNo/unitId).
 *  Internally mapped to backend field names itemCode/puUnitId before sending. */
export interface ProductInput {
  name: string
  categoryId?: string | null
  itemCode?: string | null
  description?: string | null
  make?: string | null
  puUnitId?: string | null
  stkUnitId?: string | null
  procMtd?: string | null
  locationInStore?: string | null
  quantity?: number | null
  isActive?: boolean
}

/** Map doc-style ProductInput to the live backend ProductInput field names */
function toBackendProductInput(input: ProductInput) {
  return {
    name: input.name,
    categoryId: input.categoryId ?? null,
    itemCode: input.itemCode ?? null,
    description: input.description ?? null,
    make: input.make ?? null,
    puUnitId: input.puUnitId ?? null,
    stkUnitId: input.stkUnitId ?? null,
    procMtd: input.procMtd ?? null,
    locationInStore: input.locationInStore ?? null,
    quantity: input.quantity ?? null,
    isActive: input.isActive ?? true,
  }
}

function invalidateMasterDataLists(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: masterDataKeys.all })
}

export function useCreateProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductCategoryInput) =>
      executeGraphQL<{ createProductCategory: unknown }>(CREATE_PRODUCT_CATEGORY, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product category created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create product category')); },
  })
}

export function useUpdateProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductCategoryInput }) =>
      executeGraphQL<{ updateProductCategory: unknown }>(UPDATE_PRODUCT_CATEGORY, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product category updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update product category')); },
  })
}

export function useDeleteProductCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deleteProductCategory: boolean }>(DELETE_PRODUCT_CATEGORY, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product category deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete product category')); },
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      executeGraphQL<{ createCustomer: unknown }>(CREATE_CUSTOMER, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Customer created')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) {
        toast.error(getErrorMessage(error, 'Failed to create customer'))
      }
    },
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) =>
      executeGraphQL<{ updateCustomer: unknown }>(UPDATE_CUSTOMER, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Customer updated')
    },
    onError: (error: unknown) => {
      if (!isPermissionError(error)) {
        toast.error(getErrorMessage(error, 'Failed to update customer'))
      }
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deleteCustomer: boolean }>(DELETE_CUSTOMER, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Customer deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete customer')); },
  })
}

export function useCreateUOM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UOMInput) =>
      executeGraphQL<{ createUOM: unknown }>(CREATE_UOM, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('UOM created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create UOM')); },
  })
}

export function useUpdateUOM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UOMInput }) =>
      executeGraphQL<{ updateUOM: unknown }>(UPDATE_UOM, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('UOM updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update UOM')); },
  })
}

export function useDeleteUOM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => executeGraphQL<{ deleteUOM: boolean }>(DELETE_UOM, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('UOM deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete UOM')); },
  })
}

export function useCreateTax() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TaxInput) =>
      executeGraphQL<{ createTax: unknown }>(CREATE_TAX, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Tax created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create tax')); },
  })
}

export function useUpdateTax() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaxInput }) =>
      executeGraphQL<{ updateTax: unknown }>(UPDATE_TAX, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Tax updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update tax')); },
  })
}

export function useDeleteTax() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => executeGraphQL<{ deleteTax: boolean }>(DELETE_TAX, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Tax deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete tax')); },
  })
}

export function useCreatePaymentTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentTermInput) =>
      executeGraphQL<{ createPaymentTerm: unknown }>(CREATE_PAYMENT_TERM, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Payment term created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create payment term')); },
  })
}

export function useUpdatePaymentTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PaymentTermInput }) =>
      executeGraphQL<{ updatePaymentTerm: unknown }>(UPDATE_PAYMENT_TERM, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Payment term updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update payment term')); },
  })
}

export function useDeletePaymentTerm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deletePaymentTerm: boolean }>(DELETE_PAYMENT_TERM, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Payment term deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete payment term')); },
  })
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpenseCategoryInput) =>
      executeGraphQL<{ createExpenseCategory: unknown }>(CREATE_EXPENSE_CATEGORY, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Expense category created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create expense category')); },
  })
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseCategoryInput }) =>
      executeGraphQL<{ updateExpenseCategory: unknown }>(UPDATE_EXPENSE_CATEGORY, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Expense category updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update expense category')); },
  })
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deleteExpenseCategory: boolean }>(DELETE_EXPENSE_CATEGORY, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Expense category deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete expense category')); },
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SupplierInput) =>
      executeGraphQL<{ createSupplier: unknown }>(CREATE_SUPPLIER, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Supplier created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create supplier')); },
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) =>
      executeGraphQL<{ updateSupplier: unknown }>(UPDATE_SUPPLIER, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Supplier updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update supplier')); },
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deleteSupplier: boolean }>(DELETE_SUPPLIER, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Supplier deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete supplier')); },
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VendorInput) =>
      executeGraphQL<{ createVendor: unknown }>(CREATE_VENDOR, { input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Vendor created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create vendor')); },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VendorInput }) =>
      executeGraphQL<{ updateVendor: unknown }>(UPDATE_VENDOR, { id, input }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Vendor updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update vendor')); },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => executeGraphQL<{ deleteVendor: boolean }>(DELETE_VENDOR, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Vendor deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete vendor')); },
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductInput) =>
      executeGraphQL<{ createProduct: unknown }>(CREATE_PRODUCT, { input: toBackendProductInput(input) }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product created')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to create product')); },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      executeGraphQL<{ updateProduct: unknown }>(UPDATE_PRODUCT, { id, input: toBackendProductInput(input) }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product updated')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to update product')); },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      executeGraphQL<{ deleteProduct: boolean }>(DELETE_PRODUCT, { id }),
    onSuccess: () => {
      invalidateMasterDataLists(qc)
      toast.success('Product deleted')
    },
    onError: (error: unknown) => { if (!isPermissionError(error)) toast.error(getErrorMessage(error, 'Failed to delete product')); },
  })
}
