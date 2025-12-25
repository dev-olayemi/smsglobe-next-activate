import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
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
import { SMSManagement } from './pages/SMSManagement';
import { ESimRefillManagement } from './pages/ESimRefillManagement';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminHeader } from './components/AdminHeader';
import { AdminFooter } from './components/AdminFooter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, LayoutDashboard, Users, Package, ShoppingCart, Gift, CreditCard, Settings, BarChart3, MessageSquare, Smartphone } from 'lucide-react';
import { useState } from 'react';


const navigationItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Gifts',
    href: '/admin/gifts',
    icon: Gift,
  },
  {
    title: 'Transactions',
    href: '/admin/transactions',
    icon: CreditCard,
  },
  {
    title: 'SMS Management',
    href: '/admin/sms-management',
    icon: MessageSquare,
  },
  {
    title: 'eSIM Refills',
    href: '/admin/esim-refills',
    icon: Smartphone,
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />
      <div className="flex">
        {/* Desktop Sidebar */}
        <AdminSidebar 
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-64 bg-background border-r">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Admin Panel</h2>
              </div>
              <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href.replace('/admin', '/admin')}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </nav>
              </ScrollArea>
            </div>
          </div>
        )}
        
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
          <div className="max-w-full">
            {children}
          </div>
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
          <Route path="/sms-management" element={<SMSManagement />} />
          <Route path="/esim-refills" element={<ESimRefillManagement />} />
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