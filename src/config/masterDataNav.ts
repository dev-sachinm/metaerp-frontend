/** Sub-navigation for Master Data section */

export interface MasterDataNavItem {
  path: string
  label: string
  /** Permission entity key (matches backend entity_permissions.entity_name) */
  entity: string
}

export const MASTER_DATA_NAV: MasterDataNavItem[] = [
  { path: '/master/customers', label: 'Customers', entity: 'customer' },
  { path: '/master/products', label: 'Products', entity: 'product' },
  { path: '/master/product-categories', label: 'Product Categories', entity: 'product_category' },
  { path: '/master/uom', label: 'UOM', entity: 'uom' },
  { path: '/master/tax', label: 'Tax', entity: 'tax' },
  { path: '/master/payment-terms', label: 'Payment Terms', entity: 'payment_term' },
  { path: '/master/expense-categories', label: 'Expense Categories', entity: 'expense_category' },
  { path: '/master/suppliers', label: 'Suppliers', entity: 'supplier' },
  { path: '/master/vendors', label: 'Vendors', entity: 'vendor' },
]
