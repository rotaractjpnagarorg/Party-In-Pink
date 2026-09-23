import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Heart,
  Ticket,
  Mail,
  FileBarChart,
  LogOut,
  Shield,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext.js';

const sidebarLinks = [
  {
    name: 'Overview',
    path: '/admin',
    icon: LayoutDashboard,
    end: true,
    roles: [
      'SUPER_ADMIN',
      'PAYMENT_APPROVER',
      'REGISTRATION_ADMIN',
      'TICKET_ADMIN',
      'FINANCE_VIEW',
      'VIEW_ONLY',
    ],
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    icon: ShoppingCart,
    roles: ['SUPER_ADMIN', 'REGISTRATION_ADMIN', 'VIEW_ONLY'],
  },
  {
    name: 'Payments',
    path: '/admin/payments',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'PAYMENT_APPROVER', 'FINANCE_VIEW', 'VIEW_ONLY'],
  },
  {
    name: 'Donations',
    path: '/admin/donations',
    icon: Heart,
    roles: ['SUPER_ADMIN', 'PAYMENT_APPROVER', 'FINANCE_VIEW', 'VIEW_ONLY'],
  },
  {
    name: 'Tickets',
    path: '/admin/tickets',
    icon: Ticket,
    roles: ['SUPER_ADMIN', 'TICKET_ADMIN', 'REGISTRATION_ADMIN'],
  },
  {
    name: 'Communications',
    path: '/admin/communications',
    icon: Mail,
    roles: ['SUPER_ADMIN', 'PAYMENT_APPROVER', 'REGISTRATION_ADMIN', 'FINANCE_VIEW', 'VIEW_ONLY'],
  },
  {
    name: 'Reports',
    path: '/admin/reports',
    icon: FileBarChart,
    roles: ['SUPER_ADMIN', 'REGISTRATION_ADMIN', 'FINANCE_VIEW'],
  },
];

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, loading, profile, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-pip-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const currentRoute = sidebarLinks.find((link) => link.path === location.pathname);
  if (!currentRoute || !currentRoute.roles.includes(profile?.role || '')) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pip-600 to-pink-400 flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">PiP 5.0 Admin</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {profile?.role?.replace(/_/g, ' ')}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Mobile Close Button */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pip-600 to-pink-400 flex items-center justify-center shadow-md shadow-pip-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">PiP 5.0 Admin</p>
              <p className="text-[11px] text-slate-500">Control Centre</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition"
            aria-label="Close sidebar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarLinks
            .filter((link) => link.roles.includes(profile?.role || ''))
            .map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? 'bg-pip-600/15 text-pip-400 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <link.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">{link.name}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
              </NavLink>
            ))}
        </nav>

        {/* Profile footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium text-white truncate">{profile?.displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {profile?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 min-w-0 md:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
