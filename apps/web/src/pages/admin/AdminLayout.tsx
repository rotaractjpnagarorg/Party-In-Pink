import React from 'react';
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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 fixed h-full z-40">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pip-600 to-pink-400 flex items-center justify-center shadow-md shadow-pip-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">PiP 5.0 Admin</p>
              <p className="text-[11px] text-slate-500">Control Centre</p>
            </div>
          </div>
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
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {profile?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
