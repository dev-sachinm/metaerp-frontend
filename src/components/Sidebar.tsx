import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCurrentUser, usePermissions } from '@/stores/authStore'
import { useLogout, useRefreshPermissions } from '@/hooks/useAuthQueries'
import { useEnabledModuleIds } from '@/stores/modulesStore'
import { NAV_ITEMS, type NavItemConfig } from '@/config/navigation'
import { resolvePermissionEntityKey } from '@/lib/permissionEntityKey'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  isCollapsed: boolean
  badge?: string | number
}

function NavItem({ to, icon, label, isCollapsed, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
          isActive
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/50'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        } ${isCollapsed ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {/* Icon */}
          <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
          </div>

          {/* Label - Hidden when collapsed */}
          {!isCollapsed && (
            <span className="font-medium text-sm flex-1">{label}</span>
          )}

          {/* Badge */}
          {!isCollapsed && badge && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
              {badge}
            </span>
          )}

          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
              {label}
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}

          {/* Active indicator */}
          {isActive && !isCollapsed && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
          )}
        </>
      )}
    </NavLink>
  )
}

/** Icon components for nav config */
const NAV_ICONS: Record<NonNullable<NavItemConfig['icon']>, React.ReactNode> = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  roles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  master: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  project: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zm2 8h8m-8 4h5" />
    </svg>
  ),
  purchase_order: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  ),
  audit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
}

interface SidebarProps {
  onOpenCommandPalette?: () => void
}

/**
 * Professional Sidebar Navigation
 * - Built from central nav config (NAV_ITEMS); filtered by enabled modules then by entity permissions
 * - Collapsible with smooth transitions
 * - Command palette trigger (Cmd/Ctrl+K)
 */
export function Sidebar({ onOpenCommandPalette }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const user = useCurrentUser()
  const navigate = useNavigate()
  const logoutMutation = useLogout()
  const refreshPermissions = useRefreshPermissions()
  const enabledModuleIds = useEnabledModuleIds()
  const permissions = usePermissions()
  const isDev = import.meta.env.DEV

  // Show menu item only if: (1) its module is enabled, (2) if it has an entity,
  // the user has any permission on that entity. Uses smart key resolution so
  // 'user'/'users', 'project'/'projects' etc. all match regardless of backend convention.
  // entityFallbacks provides OR-logic: item shows if user has access to entity OR any fallback.
  const visibleNavItems = useMemo(() => {
    const hasAnyPermission = (entityName: string): boolean => {
      if (!permissions?.entities) return false
      const key = resolvePermissionEntityKey(entityName, permissions.entities)
      const p = permissions.entities[key]
      if (!p) return false
      return p.create === true || p.read === true || p.update === true || p.delete === true || p.list === true
    }

    return NAV_ITEMS.filter((item) => {
      if (!enabledModuleIds.includes(item.moduleId)) return false
      if (item.entity != null) {
        if (!permissions?.entities) return false
        const key = resolvePermissionEntityKey(item.entity, permissions.entities)
        const entityPerms = permissions.entities[key]
        if (entityPerms) {
          // If a specific action is required, check only that action
          if (item.requiredAction) return entityPerms[item.requiredAction] === true
          if (
            entityPerms.create === true ||
            entityPerms.read === true ||
            entityPerms.update === true ||
            entityPerms.delete === true ||
            entityPerms.list === true
          ) return true
        }
        // Fall through to entityFallbacks check
        if (item.entityFallbacks?.length) {
          return item.entityFallbacks.some((fb) => hasAnyPermission(fb))
        }
        return false
      }
      return true
    })
  }, [enabledModuleIds, permissions])

  const handleLogout = () => {
    logoutMutation.mutate()
    navigate('/login', { replace: true })
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-40 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header - Logo & Toggle */}
      <div className={`flex items-center justify-between h-20 px-4 border-b border-slate-200 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg ring-1 ring-slate-200 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50">
                <img src="/logo.png" alt="MetaERP" className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Brand */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">MetaERP</h1>
              <p className="text-xs text-slate-500 truncate">Enterprise System</p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg ring-1 ring-slate-200">
            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50">
              <img src="/logo.png" alt="MetaERP" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all duration-200 group ${
            isCollapsed ? 'ml-0' : 'ml-2'
          }`}
          aria-label="Toggle sidebar"
        >
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Command palette trigger */}
      {onOpenCommandPalette && (
        <div className={`px-3 pt-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            aria-label="Open command palette (Ctrl+K or Cmd+K)"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Search or jump to...</span>
                <kbd className="hidden sm:inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-slate-300 bg-slate-50 px-1.5 font-mono text-[10px] text-slate-500">
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {/* Nav from central config: filtered by enabled modules then by entity permissions */}
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            icon={item.icon ? NAV_ICONS[item.icon] : null}
            label={item.label}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer - User Profile */}
      <div className={`border-t border-slate-200 p-4 ${isCollapsed ? 'p-3' : ''}`}>
        {/* User Info */}
        {user && (
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {(user.email || user.username || 'User').charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            {/* User Details */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user.email?.includes('@') ? user.email.split('@')[0] : (user.email || user.username || 'User')}
                </p>
                {user.roles.length > 0 && (
                  <p className="text-xs text-slate-500 truncate">{user.roles[0]}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Refresh permissions - pick up newly enabled fields/entities without re-login */}
        <button
          type="button"
          onClick={() => refreshPermissions.mutate()}
          disabled={refreshPermissions.isPending}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-2 ${
            refreshPermissions.isPending
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          } ${isCollapsed ? 'justify-center' : ''}`}
          title="Reload permissions (e.g. after an admin enabled new fields for your role)"
        >
          <svg
            className={`w-5 h-5 flex-shrink-0 ${refreshPermissions.isPending ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {!isCollapsed && <span>{refreshPermissions.isPending ? 'Refreshing…' : 'Refresh permissions'}</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            logoutMutation.isPending
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <svg
            className={`w-5 h-5 flex-shrink-0 ${logoutMutation.isPending ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!isCollapsed && <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>}
        </button>
      </div>

      {/* DEV-ONLY: Permission debug panel — removed from UI */}
      {/* 
      {isDev && !isCollapsed && (
        <div className="mx-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900 overflow-auto max-h-56">
          <p className="font-bold mb-1">🔍 Debug (dev only)</p>

          <p className="font-semibold">Modules (global):</p>
          <p className="break-all">{enabledModuleIds.length ? enabledModuleIds.join(', ') : '(none loaded)'}</p>
          <p>{enabledModuleIds.includes('project_management') ? '✅ project_management ON' : '❌ project_management OFF'}</p>

          <p className="font-semibold mt-1">Entity keys in myPermissions:</p>
          <p className="break-all">
            {permissions?.entities
              ? Object.keys(permissions.entities).join(', ') || '(empty object)'
              : '⚠️ null — permissions not loaded'}
          </p>

          <p className="font-semibold mt-1">"project" lookup:</p>
          <p>
            {permissions?.entities
              ? (() => {
                  const key = resolvePermissionEntityKey('project', permissions.entities)
                  const p = permissions.entities[key]
                  return p
                    ? `✅ matched key="${key}" r=${p.read} c=${p.create} u=${p.update} d=${p.delete}`
                    : `❌ no match for "project" in [${Object.keys(permissions.entities).join(', ')}]`
                })()
              : '(permissions null)'}
          </p>

          <p className="font-semibold mt-1">visibleNavItems:</p>
          <p className="break-all">{visibleNavItems.map(i => i.label).join(', ') || '(none)'}</p>
        </div>
      )}
      */}

      {/* Animated gradient accent */}
      <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-indigo-600 via-blue-600 to-indigo-600 opacity-50" />
    </aside>
  )
}
