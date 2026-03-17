/**
 * Permission entity key resolution.
 * Tries the given UI entity name against the actual keys in permissions.entities
 * (which come directly from backend byRole).  Handles singular vs plural
 * mismatches transparently so UI pages don't need to know whether the backend
 * calls the entity "user" or "users", "product" or "products", etc.
 */

/**
 * Resolve a UI entity name to the canonical key that exists in permissions.entities.
 *
 * Priority:
 *  1. Direct match            ("user"       → exists as "user")
 *  2. Simple plural  +s       ("user"       → exists as "users")
 *  3. Simple singular -s      ("users"      → exists as "user")
 *  4. -y → -ies plural        ("category"   → exists as "categories")
 *  5. -ies → -y singular      ("categories" → exists as "category")
 *  6. Fall back to the given name (caller can decide what to do with a miss)
 */
export function resolvePermissionEntityKey(
  uiEntity: string,
  entityKeys: Set<string> | Record<string, unknown> | null | undefined
): string {
  if (!entityKeys) return uiEntity

  const has = (key: string): boolean =>
    entityKeys instanceof Set ? entityKeys.has(key) : key in entityKeys

  // 1. Direct match
  if (has(uiEntity)) return uiEntity

  // 2. Try adding 's'  ("user" → "users")
  const withS = uiEntity + 's'
  if (has(withS)) return withS

  // 3. Try removing 's'  ("users" → "user")
  if (uiEntity.endsWith('s')) {
    const withoutS = uiEntity.slice(0, -1)
    if (has(withoutS)) return withoutS
  }

  // 4. -y → -ies  ("category" → "categories")
  if (uiEntity.endsWith('y')) {
    const iesForm = uiEntity.slice(0, -1) + 'ies'
    if (has(iesForm)) return iesForm
  }

  // 5. -ies → -y  ("categories" → "category")
  if (uiEntity.endsWith('ies')) {
    const yForm = uiEntity.slice(0, -3) + 'y'
    if (has(yForm)) return yForm
  }

  // 6. No match found – return as-is
  return uiEntity
}
