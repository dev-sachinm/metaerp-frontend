import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PermissionGuard } from '@/components/PermissionGuard'
import { useCurrentUser, usePermissions } from '@/stores/authStore'
import { useEntityActions, useUIPermission } from '@/hooks/usePermissions'
import { AuditLogWidget } from '@/components/AuditLogWidget'
import { DashboardLayout } from '@/layouts/DashboardLayout'

export default function Home() {
  const user = useCurrentUser()
  const permissions = usePermissions()
  const { canCreate: canCreateUser, canRead: canReadUser, canUpdate: canUpdateUser, canDelete: canDeleteUser, canList: canListUser } = useEntityActions('user')
  const canSeeAuditWidget = useUIPermission('AUDIT_LOGS_WIDGET')

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome to <span className="text-primary">MetaERP</span>
          </h1>
          <p className="text-lg text-slate-600">
            You're successfully authenticated and authorized!
          </p>
        </div>

        {/* Audit Log Widget — only for users with audit_log.read */}
        {canSeeAuditWidget && (
          <div className="mb-8 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="inline-block w-1 h-5 rounded bg-indigo-500" />
              Recent System Activity
            </h2>
            <AuditLogWidget />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {/* User Info Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">👤 User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-mono text-sm bg-slate-100 p-2 rounded mt-1">{user?.email}</p>
              </div>
              {user?.username && (
                <div>
                  <p className="text-sm text-slate-600">Username</p>
                  <p className="font-mono text-sm bg-slate-100 p-2 rounded mt-1">{user.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-600 mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {user?.roles.map((role) => (
                    <Badge key={role}>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <Badge variant="success" className="mt-1">
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">🔐 User Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 mb-2">User Entity Access</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Create</span>
                    <Badge variant={canCreateUser ? 'success' : 'outline'}>
                      {canCreateUser ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Read</span>
                    <Badge variant={canReadUser ? 'success' : 'outline'}>
                      {canReadUser ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Update</span>
                    <Badge variant={canUpdateUser ? 'success' : 'outline'}>
                      {canUpdateUser ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delete</span>
                    <Badge variant={canDeleteUser ? 'success' : 'outline'}>
                      {canDeleteUser ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>List</span>
                    <Badge variant={canListUser ? 'success' : 'outline'}>
                      {canListUser ? '✓' : '✗'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Guards Demo */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">🛡️ Permission-Based UI Elements</CardTitle>
              <CardDescription>
                These buttons appear based on your permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {/* Create Button */}
                <PermissionGuard
                  entity="user"
                  action="create"
                  fallback={
                    <Button variant="outline" disabled>
                      ❌ Create User (No Permission)
                    </Button>
                  }
                >
                  <Button variant="default">
                    ✓ Create User
                  </Button>
                </PermissionGuard>

                {/* Update Button */}
                <PermissionGuard
                  entity="user"
                  action="update"
                  fallback={
                    <Button variant="outline" disabled>
                      ❌ Edit User (No Permission)
                    </Button>
                  }
                >
                  <Button variant="default">
                    ✓ Edit User
                  </Button>
                </PermissionGuard>

                {/* Delete Button */}
                <PermissionGuard
                  entity="user"
                  action="delete"
                  fallback={
                    <Button variant="outline" disabled>
                      ❌ Delete User (No Permission)
                    </Button>
                  }
                >
                  <Button variant="destructive">
                    ✓ Delete User
                  </Button>
                </PermissionGuard>

                {/* List Button */}
                <PermissionGuard
                  entity="user"
                  action="list"
                  fallback={
                    <Button variant="outline" disabled>
                      ❌ List Users (No Permission)
                    </Button>
                  }
                >
                  <Button variant="secondary">
                    ✓ List Users
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>

          {/* Raw Permissions Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">📋 Full Permissions Object</CardTitle>
              <CardDescription>
                Complete permission structure from backend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto text-xs max-h-96">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Architecture Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>✨ Step 2 Implementation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">Fresh Fetch + React Query Strategy:</p>
                <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1">
                  <li>✅ Call /auth/me on app load for fresh data</li>
                  <li>✅ Cache permissions for 5 minutes (fast reloads)</li>
                  <li>✅ Auto-refresh in background if stale</li>
                  <li>✅ Smart error handling on 401/403</li>
                  <li>✅ Token stored in localStorage, permissions in memory</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-900">Security Layers:</p>
                <ul className="list-disc list-inside text-slate-600 mt-1 space-y-1">
                  <li>✅ UI Guards - Hide/disable elements</li>
                  <li>✅ Route Guards - Prevent page access</li>
                  <li>✅ API Validation - Backend validates every request</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}

