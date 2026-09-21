# Architecture Specification — Party In Pink 5.0 (PiP 5.0)

## 1. System Overview

PiP 5.0 is a serverless modular monolith designed for the Rotaract Club of Bangalore JP Nagar's flagship breast cancer awareness event.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + PWA on Netlify.
- **Backend**: Firebase Cloud Functions 2nd Gen (TypeScript) on Firebase Blaze.
- **Database**: Cloud Firestore (source of truth).
- **File Storage**: Firebase Storage with deny-by-default access for private payment receipts. Bulk workbooks are parsed in memory and are not persisted.
- **Payment Pipeline (PiP Pay)**: Direct UPI and SBI bank transfer (NEFT/IMPS/RTGS). No gateway fees.
- **Verification Engine**: Receipt upload + Google Cloud Vision OCR extraction + Slack Free Custom App or Admin Dashboard dual approval.
- **Fulfilment**: KonfHub Capture API v2 with 20-attendee chunking, Firestore-backed jobs, worker leases, completion checkpoints, and scheduled retries.
- **Lifecycle Communications**: Brevo Free API via `EmailProvider` adapter with webhook delivery reconciliation.

## 2. Directory Structure

```
Party-In-Pink/
  apps/web/                    # Frontend React SPA
  firebase/
    functions/src/             # Cloud Functions modular monolith
    firestore.rules            # Security rules
    storage.rules              # Storage rules
    firestore.indexes.json     # Indexes
  packages/shared/             # Domain models, schemas, and utils
  docs/                        # Architecture and operations documentation
```

## 3. Financial Concurrency & Invariants

- Integer paise is used exclusively for all money values.
- Firestore transactions lock payment state transitions (`AWAITING_PAYMENT` → `PAYMENT_SUBMITTED` → `PAYMENT_VERIFIED`).
- Slack approvals and Admin approvals execute the identical atomic verification service.
- UTR / payment references are unique across orders (`paymentReferences` lock collection).
- KonfHub ticketing failures never revert verified payment.
- Donations never create ticket jobs.
- Ambiguous provider timeouts move ticket jobs to `REVIEW_REQUIRED`; an operator reconciles KonfHub before retrying.
- Email and ticket jobs use leases and deterministic job identifiers where possible to prevent concurrent or duplicate processing.
