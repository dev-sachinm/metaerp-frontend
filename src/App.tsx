import { useEffect } from 'react'
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
import { ProductsList } from './pages/master/ProductsList'
import { ProductCategoriesList } from './pages/master/ProductCategoriesList'
import { UOMList } from './pages/master/UOMList'
import { TaxList } from './pages/master/TaxList'
import { PaymentTermsList } from './pages/master/PaymentTermsList'
import { ExpenseCategoriesList } from './pages/master/ExpenseCategoriesList'
import { SuppliersList } from './pages/master/SuppliersList'
import { VendorsList } from './pages/master/VendorsList'

// Hooks
import { useAuth } from '@/hooks/useAuthQueries'
import { useIsInitialized, useAuthStore } from '@/stores/authStore'
import { useEnabledModulesQuery } from '@/hooks/graphql/useModulesQuery'

// Components
import { Toaster } from 'sonner'
import { Loader } from '@/components/Loader'
import { NetworkError } from '@/components/NetworkError'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RequireModule } from '@/components/RequireModule'
import ModuleNotEnabled from '@/pages/ModuleNotEnabled'

const queryClient = new QueryClient()

/**
 * App Wrapper - Handles auth initialization
 */
function AppContent() {
  const { isLoading } = useAuth()
  const { setIsInitialized } = useAuthStore()

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

  // Fetch enabled modules when user is logged in (tenant context); store drives nav and RequireModule
  useEnabledModulesQuery({ enabled: !!user })

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
        <Route path="customers/:id/edit" element={<EditCustomer />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="product-categories" element={<ProductCategoriesList />} />
        <Route path="uom" element={<UOMList />} />
        <Route path="tax" element={<TaxList />} />
        <Route path="payment-terms" element={<PaymentTermsList />} />
        <Route path="expense-categories" element={<ExpenseCategoriesList />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="vendors" element={<VendorsList />} />
      </Route>

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
