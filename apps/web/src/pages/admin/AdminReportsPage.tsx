import React, { useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { Download, FileBarChart } from 'lucide-react';
import { escapeCsvCell } from '@pip/shared';

export const AdminReportsPage: React.FC = () => {
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);
    try {
      let header = '';
      const rows: string[] = [];

      if (reportType === 'ATTENDEES') {
        header =
          'Order Reference,Full Name,Email,Mobile,City,Affiliation,Club/Org,Ticket Status,Created\n';
        const ordersSnap = await getDocs(
          query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        );
        for (const orderDoc of ordersSnap.docs) {
          const order = orderDoc.data();
          const ref = order.publicReference || orderDoc.id;

          // Check for subcollection attendees
          const attendeesSnap = await getDocs(collection(db, 'orders', orderDoc.id, 'attendees'));
          if (!attendeesSnap.empty) {
            attendeesSnap.forEach((aDoc) => {
              const a = aDoc.data();
              rows.push(
                [
                  ref,
                  `"${a.fullName || ''}"`,
                  a.email || '',
                  a.mobileNumber || '',
                  a.city || '',
                  a.affiliationType || '',
                  a.clubName || a.organisationName || order.organisationName || '',
                  a.ticketStatus || '',
                  order.createdAt || '',
                ]
                  .map(escapeCsvCell)
                  .join(',')
              );
            });
          } else if (order.buyer) {
            rows.push(
              [
                ref,
                `"${order.buyer.fullName || ''}"`,
                order.buyer.email || '',
                order.buyer.mobileNumber || '',
                order.buyer.city || '',
                order.buyer.affiliationType || '',
                order.buyer.clubName || order.organisationName || '',
                order.orderStatus || '',
                order.createdAt || '',
              ]
                .map(escapeCsvCell)
                .join(',')
            );
          }
        }
      } else if (reportType === 'PAYMENTS') {
        header = 'Merchant Reference,Entity Type,Entity ID,Method,Amount,UTR,Status,Created\n';
        const snap = await getDocs(
          query(collection(db, 'paymentSessions'), orderBy('createdAt', 'desc'))
        );
        snap.forEach((doc) => {
          const d = doc.data();
          rows.push(
            [
              d.merchantReference || doc.id,
              d.entityType || '',
              d.entityId || '',
              d.method || '',
              ((d.amountPaise || 0) / 100).toFixed(2),
              d.evidence?.transactionReference || '',
              d.status || '',
              d.createdAt || '',
            ]
              .map(escapeCsvCell)
              .join(',')
          );
        });
      } else if (reportType === 'DONATIONS') {
        header = 'Reference,Donor,Email,Mobile,Amount,PAN,Anonymous,Status,Created\n';
        const snap = await getDocs(
          query(collection(db, 'donations'), orderBy('createdAt', 'desc'))
        );
        snap.forEach((doc) => {
          const d = doc.data();
          rows.push(
            [
              d.publicReference || doc.id,
              `"${d.donor?.fullName || ''}"`,
              d.donor?.email || '',
              d.donor?.mobileNumber || '',
              ((d.amountPaise || 0) / 100).toFixed(2),
              d.pan || '',
              d.isAnonymousPublicly || false,
              d.paymentStatus || '',
              d.createdAt || '',
            ]
              .map(escapeCsvCell)
              .join(',')
          );
        });
      }

      const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pip5_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`[Admin Reports] Error generating ${reportType}:`, err);
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    {
      key: 'ATTENDEES',
      label: 'All Attendees',
      desc: 'Full attendee list with order references, contact details, and ticket status.',
    },
    {
      key: 'PAYMENTS',
      label: 'Payment Sessions',
      desc: 'All payment sessions with UTR, method, amount, and verification status.',
    },
    {
      key: 'DONATIONS',
      label: 'Donations',
      desc: 'Donor details, amounts, PAN numbers, and verification status.',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Reports</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Generate CSV exports for registrations, payments, and donations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div
            key={r.key}
            className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-pip-500/15 text-pip-400">
                <FileBarChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white">{r.label}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">{r.desc}</p>
            <button
              onClick={() => generateReport(r.key)}
              disabled={generating === r.key}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-sm text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-all w-full justify-center"
            >
              {generating === r.key ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-pip-500 border-t-transparent rounded-full" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
