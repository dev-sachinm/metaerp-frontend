/**
 * Module Queries - GraphQL for enabled modules per tenant
 * Aligned with BACKEND_IMPLEMENTATION_STATE.md (enabledModules)
 */

export const GET_ENABLED_MODULES = `
  query EnabledModules {
    enabledModules {
      moduleId
      enabled
      displayName
      description
    }
  }
`
