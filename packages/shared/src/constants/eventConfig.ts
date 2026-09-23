import type { EventConfig } from '../types/index.js';
import { EventStatuses } from './index.js';

export const DEFAULT_PIP5_CONFIG: EventConfig = {
  code: 'PIP5',
  edition: '5.0',
  title: 'Party In Pink 5.0',
  status: EventStatuses.REGISTRATION_OPEN,
  eventDate: '2026-10-11T07:30:00+05:30',
  venue: 'SSMRV College, Jayanagar 4th T Block, Bengaluru',
  venueMapUrl: 'https://maps.google.com/?q=SSMRV+College+Jayanagar+4th+T+Block+Bengaluru',
  pricesPaise: {
    singlePass: 23900, // ₹239
    bulkPass: 21900, // ₹219
    bulkMinParticipants: 5,
  },
  capacity: {
    total: 1000,
    registeredCount: 0,
    confirmedCount: 0,
  },
  paymentDisplayConfig: {
    upiVpa: 'racjpn2425@ybl',
    payeeName: 'Samarth Viswanath',
    bankName: 'State Bank of India',
    accountNumber: '40745246360',
    ifscCode: 'SBIN0004408',
    branch: 'RBI Layout, JP Nagar',
  },
  donationConfig: {
    enabled: true,
    minAmountPaise: 10000, // ₹100
    maxAmountPaise: 5000000, // ₹50,000
    presetsPaise: [50000, 100000, 250000, 500000, 1000000], // ₹500, ₹1000, ₹2500, ₹5000, ₹10000
  },
  featureFlags: {
    ocrEnabled: true,
    slackApprovalEnabled: true,
    konfhubEnabled: true,
    brevoEnabled: true,
  },
  supportContact: {
    email: 'rotaractjpnagar@gmail.com',
    whatsapp: '+918618066508',
  },
  createdAt: '2026-09-16T00:00:00.000Z',
  updatedAt: '2026-09-16T00:00:00.000Z',
};
