/**
 * Zustand store for enabled modules (per tenant)
 * Single source of truth for which modules are enabled; drive nav and route guards from here.
 * See FRONTEND_ACCESS_AND_MODULES.md and FRONTEND_MODULAR_ADOPTION.md.
 */

import { create } from 'zustand'
import type { EnabledModuleItem } from '@/types/modules'

export interface ModulesState {
  /** Full list from API; use enabledModuleIds for guards/nav */
  modules: EnabledModuleItem[]
  /** Resolved list of module IDs where enabled === true */
  enabledModuleIds: string[]
  /** True after first successful fetch; avoid redirecting before load */
  modulesLoaded: boolean
  setModules: (modules: EnabledModuleItem[]) => void
  /** Clear when tenant changes or logout */
  reset: () => void
}

const initialState = {
  modules: [] as EnabledModuleItem[],
  enabledModuleIds: [] as string[],
  modulesLoaded: false,
}

export const useModulesStore = create<ModulesState>((set) => ({
  ...initialState,

  setModules: (modules: EnabledModuleItem[]) => {
    const enabledModuleIds = modules.filter((m) => m.enabled).map((m) => m.moduleId)
    set({ modules, enabledModuleIds, modulesLoaded: true })
  },

  reset: () => set(initialState),
}))

export const useEnabledModuleIds = () => useModulesStore((s) => s.enabledModuleIds)
export const useModulesList = () => useModulesStore((s) => s.modules)
export const useModulesLoaded = () => useModulesStore((s) => s.modulesLoaded)
export const useIsModuleEnabled = (moduleId: string) =>
  useModulesStore((s) => s.enabledModuleIds.includes(moduleId))
