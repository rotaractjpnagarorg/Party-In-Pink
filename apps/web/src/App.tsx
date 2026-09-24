import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { EventProvider } from './context/EventContext.js';
import { AdminAuthProvider } from './context/AdminAuthContext.js';
import { Header } from './components/layout/Header.js';
import { Footer } from './components/layout/Footer.js';
import { LandingPage } from './pages/LandingPage.js';
import { AboutPage } from './pages/AboutPage.js';
import { GalleryPage } from './pages/GalleryPage.js';
import { DetailsPage } from './pages/DetailsPage.js';
import { TermsPage } from './pages/TermsPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { RefundsPage } from './pages/RefundsPage.js';
import { ShippingPage } from './pages/ShippingPage.js';
import { ContactPage } from './pages/ContactPage.js';

import { SingleRegisterPage } from './pages/SingleRegisterPage.js';
import { StatusPage } from './pages/StatusPage.js';
import { PaymentPage } from './pages/PaymentPage.js';
import { DonatePage } from './pages/DonatePage.js';
import { SponsorshipPage } from './pages/SponsorshipPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

// Code-split heavy bulk registration & admin routes per Document 03
const BulkRegisterPage = lazy(() =>
  import('./pages/BulkRegisterPage.js').then((m) => ({ default: m.BulkRegisterPage }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage.js').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout.js').then((m) => ({ default: m.AdminLayout }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage.js').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminOrdersPage = lazy(() =>
  import('./pages/admin/AdminOrdersPage.js').then((m) => ({ default: m.AdminOrdersPage }))
);
const AdminPaymentsPage = lazy(() =>
  import('./pages/admin/AdminPaymentsPage.js').then((m) => ({ default: m.AdminPaymentsPage }))
);
const AdminDonationsPage = lazy(() =>
  import('./pages/admin/AdminDonationsPage.js').then((m) => ({ default: m.AdminDonationsPage }))
);
const AdminTicketsPage = lazy(() =>
  import('./pages/admin/AdminTicketsPage.js').then((m) => ({ default: m.AdminTicketsPage }))
);
const AdminCommunicationsPage = lazy(() =>
  import('./pages/admin/AdminCommunicationsPage.js').then((m) => ({
    default: m.AdminCommunicationsPage,
  }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage.js').then((m) => ({ default: m.AdminReportsPage }))
);

import { ScrollToTopButton, ScrollToTopOnNav } from './components/common/ScrollToTop.js';

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-pip-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const PublicLayout: React.FC = () => (
  <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans antialiased selection:bg-pip-500 selection:text-white w-full max-w-full overflow-x-hidden">
    <Header />
    <main className="flex-grow w-full max-w-full overflow-x-hidden min-w-0">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <EventProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <ScrollToTopOnNav />
            <ScrollToTopButton />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes with permanent Header/Footer shell via Outlet */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/details" element={<DetailsPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/refunds" element={<RefundsPage />} />
                  <Route path="/shipping" element={<ShippingPage />} />
                  <Route path="/contact" element={<ContactPage />} />


                  {/* Registration & Status Routes */}
                  <Route path="/register" element={<SingleRegisterPage />} />
                  <Route path="/bulk" element={<BulkRegisterPage />} />
                  <Route path="/status" element={<StatusPage />} />
                  <Route path="/status/:token" element={<StatusPage />} />

                  {/* Payment & Donation Routes */}
                  <Route path="/pay" element={<PaymentPage />} />
                  <Route path="/donate" element={<DonatePage />} />
                  <Route path="/sponsor" element={<SponsorshipPage />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin Login — standalone without Header/Footer */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* Admin Console — dark theme with sidebar, no Header/Footer */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="donations" element={<AdminDonationsPage />} />
                  <Route path="tickets" element={<AdminTicketsPage />} />
                  <Route path="communications" element={<AdminCommunicationsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AdminAuthProvider>
      </EventProvider>
    </ErrorBoundary>
  );
};

export default App;
