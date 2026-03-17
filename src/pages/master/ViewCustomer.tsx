import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/Loader'
import { OperationNotPermitted } from '@/components/OperationNotPermitted'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  Phone,
  MapPin,
  User,
  Pencil,
  Info,
} from 'lucide-react'
import { getErrorMessage, isPermissionError } from '@/lib/graphqlErrors'
import { useCustomer } from '@/hooks/graphql/useMasterDataQueries'
import {
  useEntityActions,
  useCanReadField,
  useFieldPermissions,
} from '@/hooks/usePermissions'
import type { Customer } from '@/types/masterData'

const LIST_PATH = '/master/customers'
const ENTITY = 'customer'

function formatDateTime(val?: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SectionProps { title: string; icon: React.ReactNode; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-indigo-500">{icon}</div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
        {children}
      </div>
    </div>
  )
}

interface FieldRowProps { label: string; value: React.ReactNode }
function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 px-4 py-2.5">
      <dt className="w-52 shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-900 font-medium">
        {value ?? <span className="text-slate-300 font-normal">—</span>}
      </dd>
    </div>
  )
}

export function ViewCustomer() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const entityId = id ?? ''

  const { data, isLoading, isError, error } = useCustomer(entityId || null)
  const customer: Customer | null | undefined = data?.customer
  const { canUpdate } = useEntityActions(ENTITY)

  // Field-level read permission helpers (fallback to show-all when no field perms configured)
  const rawFieldPerms = useFieldPermissions(ENTITY)
  const hasFieldPerms = rawFieldPerms !== null && Object.keys(rawFieldPerms).length > 0

  const crCode               = useCanReadField(ENTITY, 'code')
  const crName               = useCanReadField(ENTITY, 'name')
  const crAddress            = useCanReadField(ENTITY, 'address')
  const crContactInfo        = useCanReadField(ENTITY, 'contactInfo')
  const crIsActive           = useCanReadField(ENTITY, 'isActive')
  const crPrimName           = useCanReadField(ENTITY, 'primaryContactName')
  const crPrimEmail          = useCanReadField(ENTITY, 'primaryContactEmail')
  const crPrimMobile         = useCanReadField(ENTITY, 'primaryContactMobile')
  const crSecName            = useCanReadField(ENTITY, 'secondaryContactName')
  const crSecEmail           = useCanReadField(ENTITY, 'secondaryContactEmail')
  const crSecMobile          = useCanReadField(ENTITY, 'secondaryContactMobile')
  const crCreatedBy          = useCanReadField(ENTITY, 'createdBy')
  const crModifiedBy         = useCanReadField(ENTITY, 'modifiedBy')
  const crCreatedAt          = useCanReadField(ENTITY, 'createdAt')
  const crModifiedAt         = useCanReadField(ENTITY, 'modifiedAt')

  // sr(canRead) → show this field?
  const sr = (canRead: boolean) => !hasFieldPerms || canRead

  // ── guard: no id ──
  if (!entityId) { navigate(LIST_PATH, { replace: true }); return null }

  // ── loading ──
  if (isLoading && !customer) {
    return (
      <DashboardLayout>
        <div className="p-8 flex justify-center items-center min-h-[400px]">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  // ── permission error ──
  if (isError && isPermissionError(error)) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <OperationNotPermitted context="You do not have permission to view this customer." />
        </div>
      </DashboardLayout>
    )
  }

  // ── not found ──
  if (!customer) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Customer not found</CardTitle>
              <CardDescription>
                {isError && error
                  ? getErrorMessage(error, 'The requested customer could not be found.')
                  : 'This customer does not exist.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(LIST_PATH)}>
                Back to Customers
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">

        {/* Back / Edit row */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(LIST_PATH)}
            className="gap-2 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Button>
          {canUpdate && (
            <Button
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate(`${LIST_PATH}/${entityId}/edit`)}
            >
              <Pencil className="h-4 w-4" /> Edit Customer
            </Button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-5"
        >
          {/* ── Hero header ── */}
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{customer.name}</h1>
                    {customer.code && (
                      <p className="mt-1 font-mono text-sm text-indigo-200">{customer.code}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={customer.isActive ? 'default' : 'secondary'}
                  className={customer.isActive
                    ? 'bg-white/20 text-white border-white/30 hover:bg-white/20 shrink-0'
                    : 'shrink-0'}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* ── Basic Info ── */}
          <Section title="Basic Info" icon={<Info className="h-4 w-4" />}>
            {sr(crCode) && (
              <FieldRow label="Code" value={
                <span className="font-mono">{customer.code ?? '—'}</span>
              } />
            )}
            {sr(crName) && <FieldRow label="Name" value={customer.name} />}
            {sr(crAddress) && (
              <FieldRow label="Address" value={
                customer.address
                  ? <span className="whitespace-pre-wrap">{customer.address}</span>
                  : undefined
              } />
            )}
            {sr(crContactInfo) && (
              <FieldRow label="Contact Info" value={customer.contactInfo} />
            )}
            {sr(crIsActive) && (
              <FieldRow label="Active" value={
                <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              } />
            )}
          </Section>

          {/* ── Primary Contact ── */}
          {(sr(crPrimName) || sr(crPrimEmail) || sr(crPrimMobile)) && (
            <Section title="Primary Contact" icon={<User className="h-4 w-4" />}>
              {sr(crPrimName) && (
                <FieldRow label="Name" value={customer.primaryContactName} />
              )}
              {sr(crPrimEmail) && (
                <FieldRow label="Email" value={
                  customer.primaryContactEmail
                    ? <a href={`mailto:${customer.primaryContactEmail}`} className="text-indigo-600 hover:underline">{customer.primaryContactEmail}</a>
                    : undefined
                } />
              )}
              {sr(crPrimMobile) && (
                <FieldRow label="Mobile" value={
                  customer.primaryContactMobile
                    ? <a href={`tel:${customer.primaryContactMobile}`} className="text-indigo-600 hover:underline">{customer.primaryContactMobile}</a>
                    : undefined
                } />
              )}
            </Section>
          )}

          {/* ── Secondary Contact ── */}
          {(sr(crSecName) || sr(crSecEmail) || sr(crSecMobile)) && (
            <Section title="Secondary Contact" icon={<Phone className="h-4 w-4" />}>
              {sr(crSecName) && (
                <FieldRow label="Name" value={customer.secondaryContactName} />
              )}
              {sr(crSecEmail) && (
                <FieldRow label="Email" value={
                  customer.secondaryContactEmail
                    ? <a href={`mailto:${customer.secondaryContactEmail}`} className="text-indigo-600 hover:underline">{customer.secondaryContactEmail}</a>
                    : undefined
                } />
              )}
              {sr(crSecMobile) && (
                <FieldRow label="Mobile" value={
                  customer.secondaryContactMobile
                    ? <a href={`tel:${customer.secondaryContactMobile}`} className="text-indigo-600 hover:underline">{customer.secondaryContactMobile}</a>
                    : undefined
                } />
              )}
            </Section>
          )}

          {/* ── Audit ── */}
          {(sr(crCreatedBy) || sr(crModifiedBy) || sr(crCreatedAt) || sr(crModifiedAt)) && (
            <Section title="Audit" icon={<MapPin className="h-4 w-4" />}>
              <div className="grid sm:grid-cols-2">
                {sr(crCreatedBy) && (
                  <FieldRow label="Created By" value={customer.createdByUsername ?? customer.createdBy} />
                )}
                {sr(crCreatedAt) && (
                  <FieldRow label="Created At" value={formatDateTime(customer.createdAt)} />
                )}
                {sr(crModifiedBy) && (
                  <FieldRow label="Modified By" value={customer.modifiedByUsername ?? customer.modifiedBy} />
                )}
                {sr(crModifiedAt) && (
                  <FieldRow label="Modified At" value={formatDateTime(customer.modifiedAt)} />
                )}
              </div>
            </Section>
          )}

        </motion.div>
      </div>
    </DashboardLayout>
  )
}
