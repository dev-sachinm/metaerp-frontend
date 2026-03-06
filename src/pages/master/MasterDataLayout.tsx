import { Outlet, NavLink } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'

const TABS = [
  { to: '/master/customers', label: 'Customers' },
  { to: '/master/products', label: 'Products' },
  { to: '/master/product-categories', label: 'Product Categories' },
  { to: '/master/uom', label: 'UOM' },
  { to: '/master/tax', label: 'Tax' },
  { to: '/master/payment-terms', label: 'Payment Terms' },
  { to: '/master/expense-categories', label: 'Expense Categories' },
  { to: '/master/suppliers', label: 'Suppliers' },
  { to: '/master/vendors', label: 'Vendors' },
]

export function MasterDataLayout() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Master Data</h1>
          <p className="text-slate-600 mt-1">Customers, products, categories, UOM, tax, and more</p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-4 mb-6">
          {TABS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </DashboardLayout>
  )
}
