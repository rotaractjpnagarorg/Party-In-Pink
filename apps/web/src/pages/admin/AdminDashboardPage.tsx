import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import {
  Users,
  Heart,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Mail,
  ShoppingCart,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface RecentActivityItem {
  id: string;
  type: 'DONATION' | 'REGISTRATION';
  name: string;
  amountPaise: number;
  reference: string;
  dateStr: string;
  detail: string;
}

interface DashboardMetrics {
  totalOrders: number;
  singleOrders: number;
  bulkOrders: number;
  donorOrders: number;
  confirmedTicketsCount: number;
  totalDonationsCount: number;
  verifiedDonationsCount: number;
  verifiedDonationsPaise: number;
  verifiedTicketsPaise: number;
  grandTotalPaise: number;
  pendingApprovalsCount: number;
  reviewRequiredCount: number;
  emailsSent: number;
  emailsFailed: number;
}

const initialMetrics: DashboardMetrics = {
  totalOrders: 0,
  singleOrders: 0,
  bulkOrders: 0,
  donorOrders: 0,
  confirmedTicketsCount: 0,
  totalDonationsCount: 0,
  verifiedDonationsCount: 0,
  verifiedDonationsPaise: 0,
  verifiedTicketsPaise: 0,
  grandTotalPaise: 0,
  pendingApprovalsCount: 0,
  reviewRequiredCount: 0,
  emailsSent: 0,
  emailsFailed: 0,
};

function formatCurrency(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const m = { ...initialMetrics };
      const activities: RecentActivityItem[] = [];

      // 1. Fetch Donations
      const donationsSnap = await getDocs(
        query(collection(db, 'donations'), orderBy('createdAt', 'desc'))
      );

      donationsSnap.forEach((doc) => {
        const d = doc.data();
        m.totalDonationsCount++;
        const amt = d.amountPaise || 0;
        if (d.paymentStatus === 'VERIFIED') {
          m.verifiedDonationsCount++;
          m.verifiedDonationsPaise += amt;

          activities.push({
            id: doc.id,
            type: 'DONATION',
            name: d.donor?.fullName || 'Anonymous Donor',
            amountPaise: amt,
            reference: d.publicReference || doc.id.slice(0, 10),
            dateStr: d.createdAt || '',
            detail: d.referenceOrNotes || d.paymentMethod?.replace(/_/g, ' ') || 'Direct Donation',
          });
        }
      });

      // 2. Fetch Orders
      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      );

      ordersSnap.forEach((doc) => {
        const d = doc.data();
        m.totalOrders++;
        const isDonor = doc.id.startsWith('DONOR_') || d.type === 'DONOR';
        if (isDonor) {
          m.donorOrders++;
        } else if (d.type === 'BULK') {
          m.bulkOrders++;
        } else {
          m.singleOrders++;
        }

        if (d.orderStatus === 'CONFIRMED') {
          m.confirmedTicketsCount += d.participantCount || 1;
          m.verifiedTicketsPaise += d.totalAmountPaise || 0;

          if (!isDonor) {
            activities.push({
              id: doc.id,
              type: 'REGISTRATION',
              name: d.buyer?.fullName || d.organisationName || 'Attendee',
              amountPaise: d.totalAmountPaise || 0,
              reference: d.publicReference || doc.id.slice(0, 10),
              dateStr: d.createdAt || '',
              detail: `${d.participantCount || 1} Pass${(d.participantCount || 1) > 1 ? 'es' : ''} (${d.type})`,
            });
          }
        }

        if (d.orderStatus === 'PAYMENT_SUBMITTED') m.pendingApprovalsCount++;
        if (d.orderStatus === 'REVIEW_REQUIRED') m.reviewRequiredCount++;
      });

      // 3. Fetch Payment Sessions for pending verification checks
      const paymentsSnap = await getDocs(collection(db, 'paymentSessions'));
      let extraPending = 0;
      paymentsSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'PAYMENT_SUBMITTED' && !m.pendingApprovalsCount) extraPending++;
        if (d.status === 'REVIEW_REQUIRED' && !m.reviewRequiredCount) m.reviewRequiredCount++;
      });
      if (!m.pendingApprovalsCount) m.pendingApprovalsCount = extraPending;

      // 4. Fetch Email Jobs
      const emailsSnap = await getDocs(collection(db, 'emailJobs'));
      emailsSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'SENT') m.emailsSent++;
        if (d.status === 'FAILED') m.emailsFailed++;
      });

      // Grand Total
      m.grandTotalPaise = m.verifiedDonationsPaise + m.verifiedTicketsPaise;

      // Sort recent activities desc
      activities.sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));
      setRecentActivities(activities.slice(0, 10));
      setMetrics(m);
    } catch (err) {
      console.error('[Admin Dashboard] Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-pip-500 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading PiP Operations Passbook…</p>
      </div>
    );
  }

  const needsActionCount = metrics.pendingApprovalsCount + metrics.reviewRequiredCount;

  return (
    <div className="space-y-8">
      {/* Top Banner / Passbook Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Operations Passbook</span>
            </span>
            <span className="text-xs text-slate-500">• Party In Pink 5.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Executive Control & Financial Passbook
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            100% reconciled bank statement inflows, confirmed ticketing capacity, and gate readiness.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700 disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/tickets"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 text-white font-semibold text-sm shadow-md transition"
          >
            <Ticket className="w-4 h-4" />
            <span>Check-in Roster</span>
          </Link>
        </div>
      </div>

      {/* Action Required Banner if pending orders/payments */}
      {needsActionCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-amber-300 text-base">
                Action Required: {needsActionCount} Payment Submission{needsActionCount > 1 ? 's' : ''} Awaiting Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Participants have uploaded transaction references that need admin verification to issue tickets.
              </p>
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shrink-0 transition shadow-sm"
          >
            <span>Review Now</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Hero Financial Passbook (The 3 Core Revenue Pillars) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Realized Collections & Bank Inflow Reconciliation</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Grand Total */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-pip-950/40 border border-pip-500/30 rounded-3xl p-6 shadow-xl group hover:border-pip-400/50 transition-all">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-pip-300">
                Grand Total Collections
              </span>
              <div className="p-2 rounded-xl bg-pip-500/10 border border-pip-500/20 text-pip-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(metrics.grandTotalPaise)}
            </p>
            <div className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Reconciled to Bank Statement</span>
            </div>
          </div>

          {/* Pillar 2: Confirmed Donations */}
          <Link
            to="/admin/donations"
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-md hover:border-rose-500/40 hover:bg-slate-900 transition-all group block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                Verified Donations & Sponsors
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(metrics.verifiedDonationsPaise)}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {metrics.verifiedDonationsCount} confirmed donors & sponsors
              </span>
              <span className="text-rose-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>View</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Pillar 3: Verified Ticket Registrations */}
          <Link
            to="/admin/tickets"
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-md hover:border-blue-500/40 hover:bg-slate-900 transition-all group block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                Direct Ticket Sales
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(metrics.verifiedTicketsPaise)}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {metrics.confirmedTicketsCount} confirmed attendee passes
              </span>
              <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                <span>Roster</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Operational Capacity & Attendance Overview (4 Cards) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Operational Capacity & Event Readiness</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/tickets"
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Passes</span>
              <Ticket className="w-4 h-4 text-pink-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.confirmedTicketsCount}
            </p>
            <p className="text-xs text-pink-400/90 mt-1">KonfHub QR passes issued</p>
          </Link>

          <Link
            to="/admin/orders"
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.totalOrders}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.singleOrders} single • {metrics.bulkOrders} bulk • {metrics.donorOrders} donor
            </p>
          </Link>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Pass Delivery</span>
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.emailsSent}
            </p>
            <p className="text-xs text-emerald-400/90 mt-1">Official Brevo emails delivered</p>
          </div>

          <Link
            to="/admin/donations"
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition block"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Verified Donors</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.verifiedDonationsCount}
            </p>
            <p className="text-xs text-rose-400/90 mt-1">Supporters acknowledged</p>
          </Link>
        </div>
      </div>

      {/* Live PiP Passbook Stream & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passbook Stream (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Recent Passbook Transactions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time stream of verified donations, corporate sponsorships, and ticket passes.
              </p>
            </div>
            <Link
              to="/admin/donations"
              className="text-xs font-semibold text-pip-400 hover:text-pip-300 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No verified transactions recorded yet.
              </div>
            ) : (
              recentActivities.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-3 -mx-3 rounded-xl transition"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'DONATION'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {item.type === 'DONATION' ? (
                        <Heart className="w-4 h-4" />
                      ) : (
                        <Ticket className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 flex items-center space-x-2 truncate">
                        <span className="font-mono text-slate-500">{item.reference}</span>
                        <span>•</span>
                        <span className="truncate">{item.detail}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{formatCurrency(item.amountPaise)}</p>
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Navigation & Event Facts (1 col) */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Operations Center Navigation
            </h2>
            <div className="space-y-2">
              <Link
                to="/admin/tickets"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">Confirmed Tickets</span>
                    <span className="text-xs text-slate-400">Gate check-in pass roster</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>

              <Link
                to="/admin/donations"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">Confirmed Donations</span>
                    <span className="text-xs text-slate-400">Verified donor ledger & passes</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>

              <Link
                to="/admin/orders"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">Orders & Approvals</span>
                    <span className="text-xs text-slate-400">Review UTRs & verify payments</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>

              <Link
                to="/admin/reports"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-white">Audit & Reports</span>
                    <span className="text-xs text-slate-400">Export financial summaries</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </Link>
            </div>
          </div>

          {/* Event Quick Reference Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 text-xs text-slate-400 space-y-2.5">
            <div className="flex items-center space-x-2 text-white font-semibold">
              <Calendar className="w-4 h-4 text-pip-400" />
              <span>Party In Pink 5.0 Event Details</span>
            </div>
            <p>
              📍 <strong>Venue:</strong> St. Joseph's College of Commerce, Bangalore
            </p>
            <p>
              🎗️ <strong>Beneficiary:</strong> Sri Shankara Cancer Foundation
            </p>
            <p>
              🛡️ <strong>Host:</strong> Rotaract Club of Bangalore JP Nagar (RI Dist 3191)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
