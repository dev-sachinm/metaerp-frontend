import { NavLink } from 'react-router-dom'
import { useEntityActions } from '@/hooks/usePermissions'
import type { MasterDataNavItem } from '@/config/masterDataNav'

interface Props {
  item: MasterDataNavItem
}

/**
 * Permission-aware nav item for Master Data tabs.
 * Hides the tab when the user has no list/read permission for the entity.
 */
export function MasterDataNavItem({ item }: Props) {
  const { canList, canRead } = useEntityActions(item.entity)
  if (!canList && !canRead) return null

  return (
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
  )
}

