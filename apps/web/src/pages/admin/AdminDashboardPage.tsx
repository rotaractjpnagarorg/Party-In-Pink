import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import {
  Users,
  CreditCard,
  Heart,
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  IndianRupee,
  Mail,
  ShoppingCart,
} from 'lucide-react';

interface DashboardMetrics {
  totalOrders: number;
  singleOrders: number;
  bulkOrders: number;
  totalAttendees: number;
  pendingPayments: number;
  verifiedPayments: number;
  rejectedPayments: number;
  reviewPayments: number;
  totalDonations: number;
  verifiedDonations: number;
  totalCollectedPaise: number;
  donationsCollectedPaise: number;
  ticketsIssued: number;
  ticketsFailed: number;
  emailsSent: number;
  emailsFailed: number;
}

const defaultMetrics: DashboardMetrics = {
  totalOrders: 0,
  singleOrders: 0,
  bulkOrders: 0,
  totalAttendees: 0,
  pendingPayments: 0,
  verifiedPayments: 0,
  rejectedPayments: 0,
  reviewPayments: 0,
  totalDonations: 0,
  verifiedDonations: 0,
  totalCollectedPaise: 0,
  donationsCollectedPaise: 0,
  ticketsIssued: 0,
  ticketsFailed: 0,
  emailsSent: 0,
  emailsFailed: 0,
};

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color, subtext }) => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-slate-600/50 transition-all min-w-0">
    <div className="flex items-start justify-between mb-2 sm:mb-3">
      <div className={`p-2 sm:p-2.5 rounded-xl ${color}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
    <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">{value}</p>
    <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">{label}</p>
    {subtext && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">{subtext}</p>}
  </div>
);

interface UrgentQueueItem {
  id: string;
  type: 'payment' | 'ticket' | 'email';
  reference: string;
  status: string;
  timestamp: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [urgentItems, setUrgentItems] = useState<UrgentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const m = { ...defaultMetrics };

        // Orders
        const ordersSnap = await getDocs(collection(db, 'orders'));
        ordersSnap.forEach((doc) => {
          const d = doc.data();
          m.totalOrders++;
          if (d.type === 'SINGLE') m.singleOrders++;
          if (d.type === 'BULK') m.bulkOrders++;
          m.totalAttendees += d.participantCount || 1;
        });

        // Payment sessions
        const paymentsSnap = await getDocs(collection(db, 'paymentSessions'));
        paymentsSnap.forEach((doc) => {
          const d = doc.data();
          if (d.status === 'PAYMENT_SUBMITTED') m.pendingPayments++;
          if (d.status === 'VERIFIED') {
            m.verifiedPayments++;
            if (d.entityType === 'ORDER') m.totalCollectedPaise += d.amountPaise || 0;
            if (d.entityType === 'DONATION') m.donationsCollectedPaise += d.amountPaise || 0;
          }
          if (d.status === 'REJECTED') m.rejectedPayments++;
          if (d.status === 'REVIEW_REQUIRED') m.reviewPayments++;
        });

        // Donations
        const donationsSnap = await getDocs(collection(db, 'donations'));
        donationsSnap.forEach((doc) => {
          const d = doc.data();
          m.totalDonations++;
          if (d.paymentStatus === 'VERIFIED') m.verifiedDonations++;
        });

        // Tickets
        const ticketsSnap = await getDocs(collection(db, 'ticketJobs'));
        ticketsSnap.forEach((doc) => {
          const d = doc.data();
          if (d.status === 'ISSUED') m.ticketsIssued++;
          if (d.status === 'FAILED') m.ticketsFailed++;
        });

        // Emails
        const emailsSnap = await getDocs(collection(db, 'emailJobs'));
        emailsSnap.forEach((doc) => {
          const d = doc.data();
          if (d.status === 'SENT') m.emailsSent++;
          if (d.status === 'FAILED') m.emailsFailed++;
        });

        setMetrics(m);

        // Urgent queues
        const urgent: UrgentQueueItem[] = [];

        // Pending payment approvals
        const pendingPayQ = query(
          collection(db, 'paymentSessions'),
          where('status', '==', 'PAYMENT_SUBMITTED'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const pendingPaySnap = await getDocs(pendingPayQ);
        pendingPaySnap.forEach((doc) => {
          const d = doc.data();
          urgent.push({
            id: doc.id,
            type: 'payment',
            reference: d.merchantReference || doc.id.slice(0, 8),
            status: 'Pending Approval',
            timestamp: d.createdAt || '',
          });
        });

        // Failed tickets
        const failedTicketQ = query(
          collection(db, 'ticketJobs'),
          where('status', '==', 'FAILED'),
          limit(5)
        );
        const failedTicketSnap = await getDocs(failedTicketQ);
        failedTicketSnap.forEach((doc) => {
          const d = doc.data();
          urgent.push({
            id: doc.id,
            type: 'ticket',
            reference: d.orderId || doc.id.slice(0, 8),
            status: 'Ticket Failed',
            timestamp: d.updatedAt || '',
          });
        });

        // Failed emails
        const failedEmailQ = query(
          collection(db, 'emailJobs'),
          where('status', '==', 'FAILED'),
          limit(5)
        );
        const failedEmailSnap = await getDocs(failedEmailQ);
        failedEmailSnap.forEach((doc) => {
          const d = doc.data();
          urgent.push({
            id: doc.id,
            type: 'email',
            reference: d.recipientEmail || doc.id.slice(0, 8),
            status: 'Email Failed',
            timestamp: d.updatedAt || '',
          });
        });

        setUrgentItems(urgent);
      } catch (err) {
        console.error('[Admin Dashboard] Error loading metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-pip-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Party In Pink 5.0 — Operations Overview</p>
      </div>

      {/* Urgent Queues Banner */}
      {urgentItems.length > 0 && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-amber-300 text-sm">
              Action Required ({urgentItems.length})
            </h2>
          </div>
          <div className="space-y-2">
            {urgentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5"
              >
                <div className="flex items-center space-x-3">
                  {item.type === 'payment' && <CreditCard className="w-4 h-4 text-amber-400" />}
                  {item.type === 'ticket' && <Ticket className="w-4 h-4 text-red-400" />}
                  {item.type === 'email' && <Mail className="w-4 h-4 text-orange-400" />}
                  <span className="text-sm text-white font-medium">{item.reference}</span>
                </div>
                <span className="text-xs text-slate-400">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Total Registrations Collected"
          value={formatCurrency(metrics.totalCollectedPaise)}
          icon={IndianRupee}
          color="bg-emerald-500/15 text-emerald-400"
          subtext={`${metrics.verifiedPayments} verified payments`}
        />
        <MetricCard
          label="Donations Collected"
          value={formatCurrency(metrics.donationsCollectedPaise)}
          icon={Heart}
          color="bg-pip-500/15 text-pip-400"
          subtext={`${metrics.verifiedDonations} verified donations`}
        />
        <MetricCard
          label="Grand Total"
          value={formatCurrency(metrics.totalCollectedPaise + metrics.donationsCollectedPaise)}
          icon={TrendingUp}
          color="bg-blue-500/15 text-blue-400"
        />
      </div>

      {/* Registrations & Payments */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Orders"
          value={metrics.totalOrders}
          icon={ShoppingCart}
          color="bg-slate-600/30 text-slate-300"
          subtext={`${metrics.singleOrders} single • ${metrics.bulkOrders} bulk`}
        />
        <MetricCard
          label="Total Attendees"
          value={metrics.totalAttendees}
          icon={Users}
          color="bg-indigo-500/15 text-indigo-400"
        />
        <MetricCard
          label="Pending Approvals"
          value={metrics.pendingPayments}
          icon={Clock}
          color="bg-amber-500/15 text-amber-400"
          subtext={metrics.reviewPayments > 0 ? `${metrics.reviewPayments} in review` : undefined}
        />
        <MetricCard
          label="Rejected"
          value={metrics.rejectedPayments}
          icon={XCircle}
          color="bg-red-500/15 text-red-400"
        />
      </div>

      {/* Fulfilment & Comms */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Tickets Issued"
          value={metrics.ticketsIssued}
          icon={CheckCircle2}
          color="bg-emerald-500/15 text-emerald-400"
        />
        <MetricCard
          label="Tickets Failed"
          value={metrics.ticketsFailed}
          icon={AlertTriangle}
          color="bg-red-500/15 text-red-400"
        />
        <MetricCard
          label="Emails Sent"
          value={metrics.emailsSent}
          icon={Mail}
          color="bg-cyan-500/15 text-cyan-400"
        />
        <MetricCard
          label="Emails Failed"
          value={metrics.emailsFailed}
          icon={Mail}
          color="bg-orange-500/15 text-orange-400"
        />
      </div>

      {/* Donations & Activity summary */}
      <div className="mt-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Quick Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
          <div className="space-y-2">
            <p>
              📦 <strong>{metrics.totalOrders}</strong> orders ({metrics.singleOrders} individual,{' '}
              {metrics.bulkOrders} bulk)
            </p>
            <p>
              👥 <strong>{metrics.totalAttendees}</strong> total attendees registered
            </p>
            <p>
              💝 <strong>{metrics.totalDonations}</strong> donations ({metrics.verifiedDonations}{' '}
              verified)
            </p>
          </div>
          <div className="space-y-2">
            <p>
              ✅ <strong>{metrics.verifiedPayments}</strong> verified payments
            </p>
            <p>
              ⏳ <strong>{metrics.pendingPayments}</strong> awaiting verification
            </p>
            <p>
              🎟️ <strong>{metrics.ticketsIssued}</strong> tickets issued via KonfHub
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
