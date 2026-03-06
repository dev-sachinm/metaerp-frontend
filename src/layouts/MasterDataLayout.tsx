import { Outlet, NavLink } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { MASTER_DATA_NAV } from '@/config/masterDataNav'

export function MasterDataLayout() {

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
          <p className="text-slate-600 mt-1">Manage customers, products, categories, and reference data.</p>
        </div>

        <nav className="flex flex-wrap gap-1 mb-6 border-b border-slate-200 pb-4">
          {MASTER_DATA_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </DashboardLayout>
  )
}
