import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

// Pages
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import NotFound from './pages/NotFound'
import UnauthorizedError from './pages/UnauthorizedError'
import { UsersList } from './pages/users/UsersList'
import { CreateUser } from './pages/users/CreateUser'
import { EditUser } from './pages/users/EditUser'
import { ManageUserAccess } from './pages/users/ManageUserAccess'
import { ChangeUserPassword } from './pages/users/ChangeUserPassword'
import { RolesList } from './pages/roles/RolesList'
import { ManageRolePermissions } from './pages/roles/ManageRolePermissions'
import { MasterDataLayout } from './layouts/MasterDataLayout'
import { CustomersList } from './pages/master/CustomersList'
import { CreateCustomer } from './pages/master/CreateCustomer'
import { EditCustomer } from './pages/master/EditCustomer'
import { ViewCustomer } from './pages/master/ViewCustomer'
import { ProductsList } from './pages/master/ProductsList'
import { CreateProduct } from './pages/master/CreateProduct'
import { EditProduct } from './pages/master/EditProduct'
import { ProductCategoriesList } from './pages/master/ProductCategoriesList'
import { CreateProductCategory } from './pages/master/CreateProductCategory'
import { EditProductCategory } from './pages/master/EditProductCategory'
import { UOMList } from './pages/master/UOMList'
import { CreateUOM } from './pages/master/CreateUOM'
import { EditUOM } from './pages/master/EditUOM'
import { TaxList } from './pages/master/TaxList'
import { CreateTax } from './pages/master/CreateTax'
import { EditTax } from './pages/master/EditTax'
import { PaymentTermsList } from './pages/master/PaymentTermsList'
import { CreatePaymentTerm } from './pages/master/CreatePaymentTerm'
import { EditPaymentTerm } from './pages/master/EditPaymentTerm'
import { ExpenseCategoriesList } from './pages/master/ExpenseCategoriesList'
import { CreateExpenseCategory } from './pages/master/CreateExpenseCategory'
import { EditExpenseCategory } from './pages/master/EditExpenseCategory'
import { SuppliersList } from './pages/master/SuppliersList'
import { CreateSupplier } from './pages/master/CreateSupplier'
import { EditSupplier } from './pages/master/EditSupplier'
import { VendorsList } from './pages/master/VendorsList'
import { CreateVendor } from './pages/master/CreateVendor'
import { EditVendor } from './pages/master/EditVendor'
import { PurchaseOrdersList } from './pages/purchase-orders/PurchaseOrdersList'
import { CreatePurchaseOrder } from './pages/purchase-orders/CreatePurchaseOrder'
import { ViewPurchaseOrder } from './pages/purchase-orders/ViewPurchaseOrder'
import { ProjectsList } from './pages/projects/ProjectsList'
import { ProjectAssignmentPage } from './pages/projects/ProjectAssignmentPage'
import { ViewProject } from './pages/projects/ViewProject'
import { EditProject } from './pages/projects/EditProject'
import { EmailsList } from './pages/email/EmailsList'
import { AuditLogsList } from './pages/audit/AuditLogsList'
import { ViewEmail } from './pages/email/ViewEmail'

// Hooks
import { useAuth } from '@/hooks/useAuthQueries'
import { useIsInitialized, useAuthStore } from '@/stores/authStore'
import { useEnabledModulesQuery } from '@/hooks/graphql/useModulesQuery'
import { useLogContext } from '@/hooks/useLogContext'

// Components
import { Toaster } from 'sonner'
import { Loader } from '@/components/Loader'
import { Button } from '@/components/ui/button'
import { NetworkError } from '@/components/NetworkError'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RequireModule } from '@/components/RequireModule'
import ModuleNotEnabled from '@/pages/ModuleNotEnabled'

const queryClient = new QueryClient()
const INIT_TIMEOUT_MS = 10000

/**
 * App Wrapper - Handles auth initialization
 */
function AppContent() {
  useLogContext()
  const { isLoading } = useAuth()
  const { setIsInitialized } = useAuthStore()
  const accessToken = useAuthStore((state) => state.accessToken)
  const logout = useAuthStore((state) => state.logout)
  const [initTimedOut, setInitTimedOut] = useState(false)

  // Fail-safe: if auth bootstrap keeps loading too long with an existing token,
  // show a clear backend-unreachable screen instead of infinite spinner.
  useEffect(() => {
    setInitTimedOut(false)
    if (!accessToken) return
    if (!isLoading) return

    const timer = window.setTimeout(() => {
      setInitTimedOut(true)
    }, INIT_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [accessToken, isLoading])

  // Initialize auth on mount
  useEffect(() => {
    if (isLoading) return

    // Note: useAuth hook already syncs user and permissions to store via its own useEffects
    // Token is already restored from localStorage on app load
    // We just need to mark initialization as complete
    setIsInitialized(true)
  }, [isLoading, setIsInitialized])

  const isInitialized = useIsInitialized()
  const user = useAuthStore((state) => state.user)

  // All hooks must be called before any early returns (Rules of Hooks)
  useEnabledModulesQuery({ enabled: !!user })

  if (!isInitialized && initTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-rose-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <img src="/logo.png" alt="MetaERP" className="h-12" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Backend unreachable</h2>
          <p className="mt-2 text-sm text-slate-600">
            Initialization timed out after {INIT_TIMEOUT_MS / 1000}s while loading session data from the API.
          </p>
          <p className="mt-1 text-xs text-slate-500">Please verify backend availability at http://localhost:8000/graphql</p>

          <div className="mt-5 flex gap-2">
            <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout()
                window.location.href = '/login'
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes - With auth check */}
      <Route 
        path="/login" 
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        } 
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <Home />
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Users Management - Module + permission guarded */}
      <Route
        path="/users/create"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="user" action="create">
                <CreateUser />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/users/:id/access"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="user" action="update">
                <ManageUserAccess />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/users/:id/edit"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="user" action="update">
                <EditUser />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/users/:id/change-password"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="user" action="update">
                <ChangeUserPassword />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/roles/:id/permissions"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="role" action="update">
                <ManageRolePermissions />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/roles"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="role" action="read">
                <RolesList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/users"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24">
                    <Loader />
                  </div>
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="user" action="list">
                <UsersList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Audit Logs (core, permission guarded on audit_log.read) */}
      <Route
        path="/audit-logs"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="audit_log" action="delete">
                <AuditLogsList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* Emails (core, permission guarded on email.read) */}
      <Route
        path="/emails"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="email" action="read">
                <EmailsList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/emails/:id"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="core">
              <ProtectedRoute entity="email" action="read">
                <ViewEmail />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Master Data (module master_data) */}
      <Route
        path="/master"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="master_data">
              <MasterDataLayout />
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/master/customers" replace />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="customers/create" element={<CreateCustomer />} />
        <Route path="customers/:id/view" element={<ViewCustomer />} />
        <Route path="customers/:id/edit" element={<EditCustomer />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="products/create" element={<CreateProduct />} />
        <Route path="products/:id/edit" element={<EditProduct />} />
        <Route path="product-categories" element={<ProductCategoriesList />} />
        <Route path="product-categories/create" element={<CreateProductCategory />} />
        <Route path="product-categories/:id/edit" element={<EditProductCategory />} />
        <Route path="uom" element={<UOMList />} />
        <Route path="uom/create" element={<CreateUOM />} />
        <Route path="uom/:id/edit" element={<EditUOM />} />
        <Route path="tax" element={<TaxList />} />
        <Route path="tax/create" element={<CreateTax />} />
        <Route path="tax/:id/edit" element={<EditTax />} />
        <Route path="payment-terms" element={<PaymentTermsList />} />
        <Route path="payment-terms/create" element={<CreatePaymentTerm />} />
        <Route path="payment-terms/:id/edit" element={<EditPaymentTerm />} />
        <Route path="expense-categories" element={<ExpenseCategoriesList />} />
        <Route path="expense-categories/create" element={<CreateExpenseCategory />} />
        <Route path="expense-categories/:id/edit" element={<EditExpenseCategory />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="suppliers/create" element={<CreateSupplier />} />
        <Route path="suppliers/:id/edit" element={<EditSupplier />} />
        <Route path="vendors" element={<VendorsList />} />
        <Route path="vendors/create" element={<CreateVendor />} />
        <Route path="vendors/:id/edit" element={<EditVendor />} />
      </Route>

      {/* Purchase Orders */}
      <Route
        path="/purchase-orders"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="master_data">
              <ProtectedRoute entity="purchase_order" action="list">
                <PurchaseOrdersList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/purchase-orders/create"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="master_data">
              <ProtectedRoute entity="purchase_order" action="create">
                <CreatePurchaseOrder />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/purchase-orders/:id/view"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="master_data">
              <ProtectedRoute entity="purchase_order" action="read">
                <ViewPurchaseOrder />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/purchase-orders/:id/edit"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <Loader />
            </div>
          ) : user ? (
            <RequireModule moduleId="master_data">
              <ProtectedRoute entity="purchase_order" action="update">
                <ViewPurchaseOrder />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Project Management (module project_management) */}
      <Route
        path="/projects"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="project_management">
              <ProtectedRoute entity="project" action="list">
                <ProjectsList />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/projects/:id/view"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="project_management">
              <ProtectedRoute entity="project" action="read">
                <ViewProject />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/projects/:id/edit"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="project_management">
              <ProtectedRoute entity="project" action="update">
                <EditProject />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/projects/:id/edit"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="project_management">
              <ProtectedRoute entity="project" action="update">
                <EditProject />
              </ProtectedRoute>
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/projects/:id/assignment"
        element={
          !isInitialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="text-center">
                <div className="mb-6">
                  <img src="/logo.png" alt="MetaERP" className="h-16 mx-auto" />
                </div>
                <div className="flex justify-center mb-4">
                  <Loader />
                </div>
                <p className="text-slate-600 font-medium">Initializing MetaERP...</p>
              </div>
            </div>
          ) : user ? (
            <RequireModule moduleId="project_management">
              <ProjectAssignmentPage />
            </RequireModule>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Error Routes */}
      <Route path="/module-not-enabled" element={<ModuleNotEnabled />} />
      <Route path="/unauthorized" element={<UnauthorizedError />} />
      
      {/* 404 - Must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" richColors closeButton />
        <NetworkError />
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}

export default App
