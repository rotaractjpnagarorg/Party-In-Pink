# Party In Pink 5.0 — Production Runbook & Launch Verification Checklist

This runbook defines the pre-launch checklist, deployment steps, daily operational procedures, and incident recovery protocols for the **Party In Pink 5.0 (PiP 5.0)** platform in accordance with Document 07 (`07_PiP5_Operations_Deployment_and_Runbook.docx`).

---

## 1. Pre-Launch Configuration Checklist

| Area                  | Item                               | Verification Step                                                                                                               | Verified |
| :-------------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :------: |
| **Firebase Project**  | Project upgraded to Blaze          | Confirm Blaze plan active; set ₹1,500/mo budget alert                                                                           |   [ ]    |
| **Google Cloud APIs** | Cloud Vision API enabled           | Verify Vision API enabled in GCP Console for OCR                                                                                |   [ ]    |
| **Firestore**         | Security rules & indexes deployed  | Run `firebase deploy --only firestore:rules,firestore:indexes`                                                                  |   [ ]    |
| **Storage**           | Storage rules deployed             | Run `firebase deploy --only storage` (receipt isolation)                                                                        |   [ ]    |
| **Cloud Functions**   | Functions 2nd Gen deployed         | Run `firebase deploy --only functions` in `asia-south1`                                                                         |   [ ]    |
| **Netlify Frontend**  | Production SPA build deployed      | Netlify publish directory set to `apps/web/dist`                                                                                |   [ ]    |
| **Banking / PiP Pay** | SBI VPA & Bank details configured  | Complete ₹1 test UPI payment to `racjpn2425@ybl`                                                                                |   [ ]    |
| **Slack App**         | Slack interactive webhook active   | Approver bot installed; test message posted to approval channel                                                                 |   [ ]    |
| **KonfHub**           | Capture API credentials configured | Test event created; capture ticket test successful                                                                              |   [ ]    |
| **Brevo**             | Transactional email configured     | Sender domain verified; test confirmation email received                                                                        |   [ ]    |
| **Admin Super User**  | Super Admin account initialized    | From `firebase/functions`, run `ADMIN_UID=<uid> ADMIN_ROLE=SUPER_ADMIN npm run seed:admin` with Application Default Credentials |   [ ]    |
| **Abuse Protection**  | Firebase App Check enforced        | Configure the web provider, validate staging, then enforce Functions, Firestore, and Storage                                    |   [ ]    |
| **Legal / Tax**       | Donation and 80G wording approved  | Obtain written confirmation of eligible entity, receipt issuer, and receipt workflow                                            |   [ ]    |

---

## 2. Production Deployment Steps

### Step 1: Automated Quality Gates (CI)

Ensure all CI gates pass on `main`:

```bash
npm run typecheck    # 0 TypeScript errors across @pip/shared, @pip/functions, @pip/web
npm run test         # All unit and component tests pass
npm run test:rules   # Firestore/Storage rules and payment workflow emulator tests pass
npm run lint         # No lint errors
npm run format:check # Repository formatting passes
npm audit --omit=dev --audit-level=high
npm run build        # Production builds succeed (clean bundle sizes)
```

### Step 2: Deploy Firebase Backend

```bash
# Login to production project
firebase use party-in-pink-5

# Deploy rules and compound indexes
firebase deploy --only firestore:rules,firestore:indexes,storage

# Deploy Cloud Functions 2nd Gen (region asia-south1)
firebase deploy --only functions
```

### Step 3: Deploy Netlify Frontend

```bash
# Deploy apps/web production build via Netlify CLI or Git push
netlify deploy --prod --dir=apps/web/dist
```

### Step 4: Smoke Test (5-Minute Verification)

1. **Public Site**: Open `https://pip.rotaractjpnagar.org/` — check branding, timer, navigation.
2. **Registration Flow**: Fill out `/register` with test contact information.
3. **Payment Flow**: Verify UPI QR code renders with the configured VPA and authoritative ₹199 single-pass amount (or the current approved Firestore event price).
4. **Receipt Upload**: Upload receipt; verify OCR auto-detection.
5. **Slack Approval**: Verify approval card arrives in Slack approver channel; click "Approve".
6. **Ticket Issuance**: Confirm ticket appears in KonfHub dashboard.
7. **Email Delivery**: Verify confirmation email is delivered to participant inbox.
8. **Admin Console**: Navigate to `/admin`, log in as Super Admin, and check metrics overview.

---

## 3. Daily Operational SOP

### Payment Approval SOP

1. Open Slack approval card (or `/admin/payments` fallback).
2. Compare expected amount and extracted/submitted UTR/RRN.
3. Check corresponding credit in SBI banking / UPI portal.
4. **If confirmed**: Click **Approve**. (Never create tickets manually beforehand).
5. **If ambiguous**: Select **Review** with notes for investigation.
6. **If invalid**: Select **Reject** with reason.
7. Firestore transaction automatically updates state and queues ticket & email jobs.

### Handling KonfHub Outages

1. Payment verification is **never** rolled back when KonfHub fails.
2. Navigate to `/admin/tickets` to view the `FAILED` queue.
3. Once KonfHub connectivity is restored, click **Retry** on the ticket job.
4. The idempotent worker captures remaining unfulfilled tickets without creating duplicates.

### Handling Brevo Email Bounces / Failures

1. Navigate to `/admin/communications`.
2. Inspect failed deliveries and check error code (e.g. invalid domain, mailbox full).
3. If participant email was mistyped, edit attendee record in `/admin/orders` and click **Resend Confirmation**.
