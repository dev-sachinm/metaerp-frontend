/** Sub-navigation for Master Data section */

export interface MasterDataNavItem {
  path: string
  label: string
}

export const MASTER_DATA_NAV: MasterDataNavItem[] = [
  { path: '/master/customers', label: 'Customers' },
  { path: '/master/products', label: 'Products' },
  { path: '/master/product-categories', label: 'Product Categories' },
  { path: '/master/uom', label: 'UOM' },
  { path: '/master/tax', label: 'Tax' },
  { path: '/master/payment-terms', label: 'Payment Terms' },
  { path: '/master/expense-categories', label: 'Expense Categories' },
  { path: '/master/suppliers', label: 'Suppliers' },
  { path: '/master/vendors', label: 'Vendors' },
]
