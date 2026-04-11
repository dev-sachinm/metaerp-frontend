import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePurchaseOrder } from '@/hooks/graphql/usePurchaseOrderMutations'
import { useVendors, useSuppliers, useExpenseCategoriesList } from '@/hooks/graphql/useMasterDataQueries'
import { useProjects } from '@/hooks/graphql/useProjectAssignments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'

import { DashboardLayout } from '@/layouts/DashboardLayout'

export function CreatePurchaseOrder() {
  const navigate = useNavigate()
  const createMutation = useCreatePurchaseOrder()

  const { data: vendorsData } = useVendors(1, 200, { isActive: true })
  const { data: suppliersData } = useSuppliers(1, 200, { isActive: true })
  const { data: expenseCategoriesData, isLoading: ecLoading } = useExpenseCategoriesList(1, 200)
  const { data: projectsData } = useProjects(0, 200)

  const expenseCategoryOptions = expenseCategoriesData?.expenseCategoriesList?.items ?? []

  const [title, setTitle] = useState('')
  const [poType, setPoType] = useState('Miscellaneous') // or ManufacturedPart or StandardPart
  const [projectId, setProjectId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [details, setDetails] = useState('')

  const [lineItems, setLineItems] = useState<any[]>([])

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', expenseCategoryId: null, miscellaneousLineItemCost: 0 }])
  }

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems]
    updated[index][field] = value
    setLineItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up empty optional fields
    const cleanedLineItems = lineItems.map(item => ({
      description: item.description || null,
      expenseCategoryId: item.expenseCategoryId || null,
      miscellaneousLineItemCost: parseFloat(item.miscellaneousLineItemCost) || 0,
    }))

    const input = {
      title,
      poType,
      projectId: projectId || null,
      vendorId: vendorId || null,
      supplierId: supplierId || null,
      details,
      poStatus: 'Draft',
      lineItems: cleanedLineItems,
    }

    try {
      await createMutation.mutateAsync(input)
      navigate('/purchase-orders')
    } catch (err) {
      // toast handled in mutation
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="p-2 -ml-2">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Purchase Order</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new miscellaneous purchase order with line items.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">PO Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Office Supplies" />
            </div>

            <div className="space-y-2">
              <Label>PO Type</Label>
              <select 
                value={poType} 
                onChange={(e) => setPoType(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="StandardPart">Standard Part</option>
                <option value="ManufacturedPart">Manufactured Part</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <select 
                value={projectId || 'none'} 
                onChange={(e) => setProjectId(e.target.value === 'none' ? null : e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None</option>
                {projectsData?.projects.items.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectNumber} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Vendor (Optional)</Label>
              <select 
                value={vendorId || 'none'} 
                onChange={(e) => setVendorId(e.target.value === 'none' ? null : e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None</option>
                {vendorsData?.vendors.items.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Supplier (Optional)</Label>
              <select 
                value={supplierId || 'none'} 
                onChange={(e) => setSupplierId(e.target.value === 'none' ? null : e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None</option>
                {suppliersData?.suppliers.items.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Details / Notes</Label>
              <textarea 
                value={details} 
                onChange={(e) => setDetails(e.target.value)} 
                placeholder="Additional instructions..." 
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Line Items</h2>
            <Button type="button" onClick={handleAddLineItem} variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No line items added yet.</p>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} required />
                  </div>
                  <div className="w-48 space-y-2">
                    <Label className="text-xs">Expense Category</Label>
                    <select 
                      value={item.expenseCategoryId || 'none'} 
                      onChange={(e) => handleLineItemChange(index, 'expenseCategoryId', e.target.value === 'none' ? null : e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10"
                    >
                      <option value="none">{ecLoading ? 'Loading…' : '— Select —'}</option>
                      {expenseCategoryOptions.map((ec) => (
                        <option key={ec.id} value={ec.id}>{ec.name} ({ec.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-2">
                    <Label className="text-xs">Misc Cost</Label>
                    <Input type="number" step="any" min={0} value={item.miscellaneousLineItemCost} onChange={(e) => handleLineItemChange(index, 'miscellaneousLineItemCost', e.target.value)} required />
                  </div>
                  <Button type="button" variant="ghost" onClick={() => handleRemoveLineItem(index)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 h-10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
            {createMutation.isPending ? 'Saving...' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  )
}
