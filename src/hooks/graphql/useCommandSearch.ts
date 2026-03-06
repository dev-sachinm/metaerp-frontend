/**
 * Command Search Hook - Debounced search for command palette
 * Searches across multiple entities with GraphQL
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { executeGraphQL } from '@/graphql/client';
import { GLOBAL_SEARCH } from '@/graphql/queries/search.queries';

// Type definitions (backend: users paginated, getRoles array)
export interface GlobalSearchResult {
  users: {
    items: Array<{
      id: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      email: string;
      roles: string[];
    }>;
  };
  getRoles: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

const SEARCH_LIMIT = 20;

/**
 * Global search hook for command palette.
 * Fetches users and roles; filter by search string in the component (client-side).
 * @param enabled - When true, fetches data (e.g. when palette is open).
 */
export function useGlobalSearch(enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'global'],
    queryFn: () =>
      executeGraphQL<GlobalSearchResult>(GLOBAL_SEARCH, {
        limit: SEARCH_LIMIT,
      }),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Filter search results client-side by query string (users: email, username, name; roles: name, description).
 */
export function filterGlobalSearch(
  data: GlobalSearchResult | undefined,
  query: string
): GlobalSearchResult | undefined {
  if (!data) return undefined;
  const q = query.trim().toLowerCase();
  if (!q) return data;

  return {
    users: {
      items: data.users.items.filter((u) => {
        const email = (u.email ?? '').toLowerCase();
        const username = (u.username ?? '').toLowerCase();
        const first = (u.firstName ?? '').toLowerCase();
        const last = (u.lastName ?? '').toLowerCase();
        return email.includes(q) || username.includes(q) || first.includes(q) || last.includes(q);
      }),
    },
    getRoles: data.getRoles.filter((r) => {
      const name = (r.name ?? '').toLowerCase();
      const desc = (r.description ?? '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    }),
  };
}

/**
 * Search users only (lighter query for user-specific searches)
 */
export function useSearchUsers(query: string, limit: number = 10) {
  const SEARCH_USERS_QUERY = `
    query SearchUsers($skip: Int!, $limit: Int!) {
      users(skip: 0, limit: $limit) {
        items {
          id
          email
          roles
          isActive
        }
      }
    }
  `;
  
  return useQuery({
    queryKey: ['search', 'users', query],
    queryFn: () =>
      executeGraphQL<{ users: { items: any[] } }>(SEARCH_USERS_QUERY, {
        skip: 0,
        limit,
      }),
    enabled: query.length > 1,
    staleTime: 30 * 1000,
  });
}

/**
 * Format search results for command palette display (groups by type with labels).
 * Uses useGlobalSearch(enabled) and filterGlobalSearch for client-side filter.
 */
export function useFormattedSearchResults(enabled: boolean, query: string) {
  const { data } = useGlobalSearch(enabled);
  const filtered = useMemo(
    () => filterGlobalSearch(data, query),
    [data, query]
  );

  return useMemo(() => {
    if (!filtered) return [];
    const results: Array<{ type: string; heading: string; items: any[] }> = [];
    if (filtered.users?.items.length > 0) {
      results.push({
        type: 'group',
        heading: 'Users',
        items: filtered.users.items.map((user) => ({
          id: user.id,
          type: 'user',
          label: user.email || user.username || 'User',
          subtitle: (user.roles ?? []).join(', '),
          icon: 'User',
          action: () => (window.location.href = `/users`),
        })),
      });
    }
    if (filtered.getRoles?.length > 0) {
      results.push({
        type: 'group',
        heading: 'Roles',
        items: filtered.getRoles.map((role) => ({
          id: role.id,
          type: 'role',
          label: role.name,
          subtitle: role.description ?? '',
          icon: 'Shield',
          action: () => (window.location.href = `/users`),
        })),
      });
    }
    return results;
  }, [filtered]);
}
