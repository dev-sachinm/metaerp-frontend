import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AssignmentPermissionsGuard } from '@/components/project-assignment/AssignmentPermissionsGuard'
import { AssignmentBoard } from '@/components/project-assignment/AssignmentBoard'

export function ProjectAssignmentPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''

  if (!projectId) {
    navigate('/projects', { replace: true })
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Button>

        <AssignmentPermissionsGuard>
          <AssignmentBoard projectId={projectId} />
        </AssignmentPermissionsGuard>
      </div>
    </DashboardLayout>
  )
}
