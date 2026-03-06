/**
 * Module types for enable/disable per tenant
 * Aligned with backend enabledModules query (BACKEND_IMPLEMENTATION_STATE.md)
 */

export interface EnabledModuleItem {
  moduleId: string
  enabled: boolean
  displayName: string | null
  description: string | null
}

export interface EnabledModulesResponse {
  enabledModules: EnabledModuleItem[]
}
