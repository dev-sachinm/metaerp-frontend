import { useQuery } from '@tanstack/react-query'
import { executeGraphQL } from '@/graphql/client'
import {
  GET_PURCHASE_ORDERS,
  GET_PURCHASE_ORDER,
} from '@/graphql/queries/purchaseOrder.queries'
import type { PurchaseOrder, PurchaseOrderSummary } from '@/types/purchaseOrder'
import type { PaginatedList } from '@/types/masterData'

export const poKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...poKeys.all, 'list'] as const,
  list: (skip: number, limit: number, isActive?: boolean | null) =>
    [...poKeys.lists(), { skip, limit, isActive }] as const,
  details: () => [...poKeys.all, 'detail'] as const,
  detail: (id: string) => [...poKeys.details(), id] as const,
}

export function usePurchaseOrders(skip = 0, limit = 100, isActive?: boolean | null) {
  return useQuery({
    queryKey: poKeys.list(skip, limit, isActive),
    queryFn: () =>
      executeGraphQL<{ purchaseOrders: PaginatedList<PurchaseOrderSummary> }>(GET_PURCHASE_ORDERS, {
        skip,
        limit,
        isActive,
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
