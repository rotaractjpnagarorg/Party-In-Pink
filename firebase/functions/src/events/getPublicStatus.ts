import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase.js';
import { type Donation, type Order, type PublicOrderStatus } from '@pip/shared';

interface GetPublicStatusRequest {
  token?: string;
  reference?: string;
  email?: string;
}

export const getPublicStatus = onCall(
  {
    region: 'asia-south1',
    maxInstances: 10,
  },
  async (request): Promise<PublicOrderStatus> => {
    const data = (request.data || {}) as GetPublicStatusRequest;
    const token = typeof data.token === 'string' ? data.token.trim() : '';
    const reference = typeof data.reference === 'string' ? data.reference.trim().toUpperCase() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';

    if (!token && !reference) {
      throw new HttpsError(
        'invalid-argument',
        'Either status token or order reference must be provided'
      );
    }

    let order: Order | null = null;
    let donation: Donation | null = null;

    if (token) {
      // Lookup by opaque status token
      const snapshot = await db
        .collection('orders')
        .where('statusToken', '==', token)
        .limit(1)
        .get();

      const firstDoc = snapshot.docs[0];
      if (firstDoc) {
        order = firstDoc.data() as Order;
      } else {
        const donationSnapshot = await db
          .collection('donations')
          .where('statusToken', '==', token)
          .limit(1)
          .get();
        if (donationSnapshot.docs[0]) donation = donationSnapshot.docs[0].data() as Donation;
      }
    } else if (reference) {
      // Lookup by public reference with email verification to prevent enumeration (SEC-P0-003)
      if (!email) {
        throw new HttpsError(
          'permission-denied',
          'Registered buyer email is required when searching by public reference'
        );
      }

      const snapshot = await db
        .collection('orders')
        .where('publicReference', '==', reference)
        .limit(1)
        .get();

      const firstDoc = snapshot.docs[0];
      if (firstDoc) {
        const found = firstDoc.data() as Order;
        if (found.buyer.email.toLowerCase() === email) {
          order = found;
        } else {
          // Avoid giving away whether reference exists
          throw new HttpsError('not-found', 'No order found matching the reference and email');
        }
      } else {
        const donationSnapshot = await db
          .collection('donations')
          .where('publicReference', '==', reference)
          .limit(1)
          .get();
        const donationDoc = donationSnapshot.docs[0];
        if (donationDoc) {
          const found = donationDoc.data() as Donation;
          if (found.donor.email.toLowerCase() === email) donation = found;
          else
            throw new HttpsError('not-found', 'No record found matching the reference and email');
        }
      }
    }

    if (!order && !donation) {
      throw new HttpsError('not-found', 'No registration found for the provided details');
    }

    if (donation) {
      const passes = donation.complimentaryPassesCount || 0;
      return {
        publicReference: donation.publicReference,
        statusToken: donation.statusToken,
        type: 'DONATION',
        orderStatus: donation.donationStatus,
        paymentStatus: donation.paymentStatus,
        participantCount: passes,
        totalAmountPaise: donation.amountPaise,
        currency: donation.currency,
        buyerName: donation.isAnonymousPublicly ? 'Anonymous Donor' : donation.donor.fullName,
        organisationName: donation.organisationName || null,
        ticketsIssuedCount: donation.donationStatus === 'VERIFIED' ? passes : 0,
        createdAt: donation.createdAt,
      };
    }

    const resolvedOrder = order!;

    // Return sanitized public representation (SEC-P0-003)
    return {
      publicReference: resolvedOrder.publicReference,
      statusToken: resolvedOrder.statusToken,
      type: resolvedOrder.type,
      orderStatus: resolvedOrder.orderStatus,
      paymentStatus: resolvedOrder.paymentStatus,
      participantCount: resolvedOrder.participantCount,
      totalAmountPaise: resolvedOrder.totalAmountPaise,
      currency: resolvedOrder.currency,
      buyerName: resolvedOrder.buyer.fullName,
      organisationName: resolvedOrder.organisationName || null,
      ticketsIssuedCount:
        resolvedOrder.orderStatus === 'CONFIRMED' ? resolvedOrder.participantCount : 0,
      createdAt: resolvedOrder.createdAt,
    };
  }
);
