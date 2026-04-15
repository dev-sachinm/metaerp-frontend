import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  GET_PURCHASE_ORDERS,
  GET_PURCHASE_ORDER,
  PURCHASE_ORDERS_BY_FIXTURE,
  STANDARD_PARTS_FOR_PO,
} from '@/graphql/queries/purchaseOrder.queries'
import type { PurchaseOrder, PurchaseOrderSummary, PoByFixture, StandardPartForPo } from '@/types/purchaseOrder'
import type { PaginatedList } from '@/types/masterData'

export interface PurchaseOrderFilters {
  isActive?: boolean | null
  poNumberContains?: string
  titleContains?: string
  poStatusContains?: string
}

export const poKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...poKeys.all, 'list'] as const,
  list: (page: number, pageSize: number, filters: PurchaseOrderFilters) =>
    [...poKeys.lists(), { page, pageSize, ...filters }] as const,
  details: () => [...poKeys.all, 'detail'] as const,
  detail: (id: string) => [...poKeys.details(), id] as const,
  byFixture: (fixtureId: string, poType: string | null, partIds?: string[], excludeStatuses?: string[]) =>
    [...poKeys.all, 'byFixture', fixtureId, poType, partIds, excludeStatuses] as const,
  standardPartsForPo: (fixtureId: string) =>
    [...poKeys.all, 'standardPartsForPo', fixtureId] as const,
}

export function usePurchaseOrders(page = 1, pageSize = 20, filters: PurchaseOrderFilters = {}) {
  return useQuery({
    queryKey: poKeys.list(page, pageSize, filters),
    queryFn: () =>
      executeGraphQL<{ purchaseOrders: PaginatedList<PurchaseOrderSummary> }>(GET_PURCHASE_ORDERS, {
        page,
        pageSize,
        isActive: filters.isActive ?? undefined,
        poNumberContains: filters.poNumberContains || undefined,
        titleContains: filters.titleContains || undefined,
        poStatusContains: filters.poStatusContains || undefined,
      }),
  })
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: poKeys.detail(id!),
    queryFn: () => executeGraphQL<{ purchaseOrder: PurchaseOrder | null }>(GET_PURCHASE_ORDER, { id: id! }),
    enabled: !!id,
  })
}

export function usePurchaseOrdersByFixture(
  fixtureId: string,
  poType: string | null = 'StandardPart',
  enabled = true,
  partIds?: string[],
  excludeStatuses?: string[],
) {
  return useQuery({
    queryKey: poKeys.byFixture(fixtureId, poType, partIds, excludeStatuses),
    queryFn: () =>
      executeGraphQL<{ purchaseOrdersByFixture: PoByFixture[] }>(PURCHASE_ORDERS_BY_FIXTURE, {
        fixtureId,
        poType: poType ?? undefined,
        partIds: partIds && partIds.length > 0 ? partIds : undefined,
        excludeStatuses: excludeStatuses && excludeStatuses.length > 0 ? excludeStatuses : undefined,
      }),
    enabled: !!fixtureId && enabled,
  })
}

export function useStandardPartsForPo(fixtureId: string, enabled = true) {
  return useQuery({
    queryKey: poKeys.standardPartsForPo(fixtureId),
    queryFn: () =>
      executeGraphQL<{ standardPartsForPo: StandardPartForPo[] }>(STANDARD_PARTS_FOR_PO, { fixtureId }),
    enabled: !!fixtureId && enabled,
  })
}
