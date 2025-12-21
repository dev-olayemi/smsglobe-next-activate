import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './auth/AdminAuthContext';
import { AdminLogin } from './auth/AdminLogin';
import { AdminForgotPassword } from './auth/AdminForgotPassword';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminDashboard } from './pages/AdminDashboard';
import { UsersManagement } from './pages/UsersManagement';
import { ProductsManagement } from './pages/ProductsManagement';
import { OrdersManagement } from './pages/OrdersManagement';
import { GiftsManagement } from './pages/GiftsManagement';
import { TransactionsManagement } from './pages/TransactionsManagement';
import { SettingsManagement } from './pages/SettingsManagement';
import { ReportsAnalytics } from './pages/ReportsAnalytics';
import { AdminProfile } from './pages/AdminProfile';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { AdminFooter } from './components/AdminFooter';
import { Loader2 } from 'lucide-react';

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

function AdminRoutes() {
  const { user, loading, isAdmin } = useAdminAuth();
  const location = useLocation();
  
  // Determine the base path (either /admin or /admin-panel)
  const basePath = location.pathname.startsWith('/admin-panel') ? '/admin-panel' : '/admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to={`${basePath}/dashboard`} replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/products" element={<ProductsManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/gifts" element={<GiftsManagement />} />
          <Route path="/transactions" element={<TransactionsManagement />} />
          <Route path="/settings" element={<SettingsManagement />} />
          <Route path="/reports" element={<ReportsAnalytics />} />
          <Route path="/profile" element={<AdminProfile />} />
        </Routes>
      </ErrorBoundary>
    </AdminLayout>
  );
}

export function AdminApp() {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <AdminRoutes />
      </AdminAuthProvider>
    </ErrorBoundary>
  );
}