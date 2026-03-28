/**
 * Central entity & field registry for all master data (and future entities).
 * Single source of truth for:
 * - Which fields exist per entity (key, label, type, optional)
 * - List/create/edit titles
 * Adding a new entity or field here makes it available to list/create/edit
 * when the user has the corresponding permission (no per-page patches).
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'boolean'
  | 'textarea'
  | 'code'
  | 'date'

export interface FieldConfig {
  /** camelCase key; must match backend/GraphQL and permission keys (normalized) */
  key: string
  label: string
  type: FieldType
  optional?: boolean
  placeholder?: string
  /** If true, show in list but treat as read-only in forms (e.g. createdAt) */
  readOnlyInForm?: boolean
}

export interface EntityFieldConfig {
  entity: string
  listTitle: string
  createTitle: string
  editTitle: string
  description?: string
  fields: FieldConfig[]
}

/** All field definitions per entity. Keys are entity names (singular, match backend entity_permissions.entity_name). */
export const ENTITY_FIELDS: Record<string, EntityFieldConfig> = {
  customer: {
    entity: 'customer',
    listTitle: 'Customers',
    createTitle: 'Create Customer',
    editTitle: 'Edit Customer',
    description: 'Manage customer records',
    fields: [
      { key: 'code', label: 'Code', type: 'code', optional: false, placeholder: 'CUST-001' },
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'address', label: 'Address', type: 'textarea', optional: true },
      { key: 'contactInfo', label: 'Contact info', type: 'text', optional: true },
      { key: 'primaryContactName', label: 'Primary contact name', type: 'text', optional: true },
      { key: 'primaryContactEmail', label: 'Primary contact email', type: 'email', optional: true },
      { key: 'primaryContactMobile', label: 'Primary contact mobile', type: 'tel', optional: true },
      { key: 'secondaryContactName', label: 'Secondary contact name', type: 'text', optional: true },
      { key: 'secondaryContactEmail', label: 'Secondary contact email', type: 'email', optional: true },
      { key: 'secondaryContactMobile', label: 'Secondary contact mobile', type: 'tel', optional: true },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  product_category: {
    entity: 'product_category',
    listTitle: 'Product Categories',
    createTitle: 'Create Product Category',
    editTitle: 'Edit Product Category',
    fields: [
      { key: 'categoryName', label: 'Category name', type: 'text', optional: false },
      { key: 'parentId', label: 'Parent', type: 'text', optional: true },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  uom: {
    entity: 'uom',
    listTitle: 'UOM',
    createTitle: 'Create UOM',
    editTitle: 'Edit UOM',
    fields: [
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  tax: {
    entity: 'tax',
    listTitle: 'Tax',
    createTitle: 'Create Tax',
    editTitle: 'Edit Tax',
    fields: [
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'ratePercent', label: 'Rate %', type: 'number', optional: false },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  payment_term: {
    entity: 'payment_term',
    listTitle: 'Payment Terms',
    createTitle: 'Create Payment Term',
    editTitle: 'Edit Payment Term',
    fields: [
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'days', label: 'Days', type: 'number', optional: false },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  expense_category: {
    entity: 'expense_category',
    listTitle: 'Expense Categories',
    createTitle: 'Create Expense Category',
    editTitle: 'Edit Expense Category',
    fields: [
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'parentId', label: 'Parent ID', type: 'text', optional: true },
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  supplier: {
    entity: 'supplier',
    listTitle: 'Suppliers',
    createTitle: 'Create Supplier',
    editTitle: 'Edit Supplier',
    fields: [
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'contactPerson', label: 'Contact person', type: 'text', optional: true },
      { key: 'email', label: 'Email', type: 'email', optional: true },
      { key: 'phone', label: 'Phone', type: 'tel', optional: true },
      { key: 'address', label: 'Address', type: 'textarea', optional: true },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  vendor: {
    entity: 'vendor',
    listTitle: 'Vendors',
    createTitle: 'Create Vendor',
    editTitle: 'Edit Vendor',
    fields: [
      { key: 'code', label: 'Code', type: 'code', optional: false },
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'contactPerson', label: 'Contact person', type: 'text', optional: true },
      { key: 'email', label: 'Email', type: 'email', optional: true },
      { key: 'phone', label: 'Phone', type: 'tel', optional: true },
      { key: 'address', label: 'Address', type: 'textarea', optional: true },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
  product: {
    entity: 'product',
    listTitle: 'Products',
    createTitle: 'Create Product',
    editTitle: 'Edit Product',
    fields: [
      { key: 'name', label: 'Name', type: 'text', optional: false },
      { key: 'categoryId', label: 'Product Category', type: 'text', optional: true },
      { key: 'itemCode', label: 'Item Code', type: 'code', optional: true },
      { key: 'description', label: 'Description', type: 'textarea', optional: true },
      { key: 'make', label: 'Make', type: 'text', optional: true },
      { key: 'puUnitId', label: 'Purchase Unit', type: 'text', optional: true },
      { key: 'stkUnitId', label: 'Stock Unit', type: 'text', optional: true },
      { key: 'procMtd', label: 'Procurement Method', type: 'text', optional: true },
      { key: 'locationInStore', label: 'Location in Store', type: 'text', optional: true },
      { key: 'quantity', label: 'Stock Qty', type: 'number', optional: true },
      { key: 'isActive', label: 'Active', type: 'boolean', optional: true },
      { key: 'createdBy', label: 'Created by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'modifiedBy', label: 'Modified by', type: 'text', optional: true, readOnlyInForm: true },
      { key: 'createdAt', label: 'Created at', type: 'date', optional: true, readOnlyInForm: true },
      { key: 'modifiedAt', label: 'Modified at', type: 'date', optional: true, readOnlyInForm: true },
    ],
  },
}

export function getEntityConfig(entity: string): EntityFieldConfig | null {
  return ENTITY_FIELDS[entity] ?? null
}

export function getFieldsForEntity(entity: string): FieldConfig[] {
  return getEntityConfig(entity)?.fields ?? []
}
