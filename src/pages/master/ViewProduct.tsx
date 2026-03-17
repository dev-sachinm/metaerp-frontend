import { useNavigate, useParams, Link } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, Pencil } from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { useProduct } from '@/hooks/graphql/useMasterDataQueries'
import { useAccessibleFields, canShowColumn } from '@/hooks/usePermissions'
import type { Product } from '@/types/masterData'

const ENTITY = 'product'
const LIST_PATH = '/master/products'

interface FieldRowProps {
  label: string
  value: React.ReactNode
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <dt className="w-48 shrink-0 text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  )
}

export function ViewProduct() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''

  const { data, isLoading, isError, error } = useProduct(entityId || null)
  const product = (data as { product: Product | null } | undefined)?.product
  const readableFields = useAccessibleFields(ENTITY, 'read')

  if (!entityId) { navigate(LIST_PATH, { replace: true }); return null }

  if (isLoading && !product) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  if (isError && error && isPermissionError(error)) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <OperationNotPermitted context="You do not have permission to view this product." />
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Product not found</CardTitle>
              <CardDescription>
                {isError && error ? getErrorMessage(error, 'Not found.') : 'This product does not exist.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>
                Back to Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(LIST_PATH)}
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Button>
          <Button asChild size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Link to={`/master/products/${entityId}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    {product.name}
                  </CardTitle>
                  {product.partNo && (
                    <CardDescription className="mt-1 text-sm text-slate-500">
                      Part No: {product.partNo}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <dl>
                {canShowColumn(readableFields, 'name') && (
                  <FieldRow label="Name" value={product.name} />
                )}
                {canShowColumn(readableFields, 'partNo') && (
                  <FieldRow label="Part No" value={product.partNo} />
                )}
                {canShowColumn(readableFields, 'categoryId') && (
                  <FieldRow label="Category" value={product.categoryId} />
                )}
                {canShowColumn(readableFields, 'description') && (
                  <FieldRow label="Description" value={product.description} />
                )}
                {canShowColumn(readableFields, 'make') && (
                  <FieldRow label="Make" value={product.make} />
                )}
                {canShowColumn(readableFields, 'unitId') && (
                  <FieldRow label="Unit" value={product.unitName ?? product.unitId} />
                )}
                {canShowColumn(readableFields, 'quantity') && (
                  <FieldRow
                    label="Stock"
                    value={product.quantity != null ? String(product.quantity) : null}
                  />
                )}
                {canShowColumn(readableFields, 'isActive') && (
                  <FieldRow
                    label="Status"
                    value={
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    }
                  />
                )}
                {canShowColumn(readableFields, 'createdBy') && (
                  <FieldRow label="Created By" value={product.createdByUsername ?? product.createdBy} />
                )}
                {canShowColumn(readableFields, 'createdAt') && (
                  <FieldRow
                    label="Created At"
                    value={product.createdAt ? new Date(product.createdAt).toLocaleString() : null}
                  />
                )}
                {canShowColumn(readableFields, 'modifiedBy') && (
                  <FieldRow label="Modified By" value={product.modifiedByUsername ?? product.modifiedBy} />
                )}
                {canShowColumn(readableFields, 'modifiedAt') && (
                  <FieldRow
                    label="Modified At"
                    value={product.modifiedAt ? new Date(product.modifiedAt).toLocaleString() : null}
                  />
                )}
              </dl>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
