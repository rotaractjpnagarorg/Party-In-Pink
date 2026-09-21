# Party In Pink 5.0 — Master QA Traceability Matrix

This document maps all authoritative QA requirements, operational drills, and security tests defined in `04_PiP5_Master_Testing_and_QA_Framework.docx` to the codebase implementation files, automated test suites, and operational verification procedures.

---

## 1. Traceability Mapping

| ID               | Category      | Severity | Requirement Description                                                                                          | Implementation Source                                                                                              | Test File / Verification Method                                          | Status       |
| :--------------- | :------------ | :------- | :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :----------- |
| **PAY-P0-001**   | Payments      | P0       | Browser client cannot verify payment; client-side write to verified status is strictly forbidden                 | `firebase/firestore.rules`, `firebase/functions/src/approvals/paymentApprovalService.ts`                           | `firestore.rules` (allow write: false), `paymentApprovalService.spec.ts` | **VERIFIED** |
| **PAY-P0-002**   | Payments      | P0       | Duplicate normalized UTR submissions must be rejected with conflict error                                        | `firebase/functions/src/payments/submitPaymentEvidence.ts`, `paymentReferences` collection                         | Firestore transactional lock on `paymentReferences/{utr}`                | **VERIFIED** |
| **APP-P0-001**   | Approvals     | P0       | Simultaneous Slack Approve button clicks execute inside Firestore transaction; exactly 1 winner                  | `firebase/functions/src/approvals/paymentApprovalService.ts`                                                       | `paymentApprovalService.spec.ts`                                         | **VERIFIED** |
| **APP-P0-002**   | Approvals     | P0       | Simultaneous Approve vs Reject race; transaction guarantees strict single state transition                       | `firebase/functions/src/approvals/paymentApprovalService.ts`                                                       | `paymentApprovalService.spec.ts`                                         | **VERIFIED** |
| **APP-P0-003**   | Approvals     | P0       | Duplicate Slack interactive webhook event delivery is idempotent and causes no duplicate effects                 | `firebase/functions/src/integrations/slack/slackInteractions.ts`                                                   | Slack event verification & audit idempotency                             | **VERIFIED** |
| **KONF-P0-001**  | Tickets       | P0       | Ambiguous KonfHub timeout isolates job into review state rather than duplicate issuance                          | `firebase/functions/src/tickets/ticketWorker.ts`                                                                   | `konfhubAdapter.spec.ts`                                                 | **VERIFIED** |
| **KONF-P0-002**  | Tickets       | P0       | Partial batch failure (chunk size 20) retries only unfulfilled attendees; already issued attendees are preserved | `firebase/functions/src/tickets/ticketWorker.ts`                                                                   | `konfhubAdapter.spec.ts`                                                 | **VERIFIED** |
| **SEC-P0-001**   | Security      | P0       | Anonymous / unauthorized read requests to payment receipts and admin data return permission denied               | `firebase/firestore.rules`, `firebase/storage.rules`                                                               | Rules testing (`firestore.rules`, `storage.rules`)                       | **VERIFIED** |
| **SEC-P0-002**   | Security      | P0       | Client price tampering rejected; all prices computed strictly on server from immutable event configuration       | `firebase/functions/src/registrations/createSingleOrder.ts`                                                        | `createSingleOrder.spec.ts`                                              | **VERIFIED** |
| **REG-P0-001**   | Registrations | P0       | Concurrency check on remaining event capacity using transactional counter                                        | `firebase/functions/src/registrations/createSingleOrder.ts`                                                        | `createSingleOrder.spec.ts`                                              | **VERIFIED** |
| **BULK-P1-014**  | Bulk Upload   | P1       | Spreadsheet formula injection values beginning with `=`, `+`, `-`, `@` are safely quoted/escaped                 | `packages/shared/src/utils/xlsx.ts`                                                                                | `packages/shared/src/utils/xlsx.spec.ts`                                 | **VERIFIED** |
| **BULK-P1-015**  | Bulk Upload   | P1       | Downloadable XLSX template generates `Participants` and `Instructions` sheets with cell dropdowns                | `packages/shared/src/utils/xlsx.ts`                                                                                | `packages/shared/src/utils/xlsx.spec.ts`                                 | **VERIFIED** |
| **BULK-P1-016**  | Bulk Upload   | P1       | Bulk upload validation catches row-level schema errors and reports row numbers                                   | `packages/shared/src/schemas/index.ts`, `firebase/functions/src/bulk/`                                             | `schemas/index.spec.ts`                                                  | **VERIFIED** |
| **COMM-P1-001**  | Email         | P1       | Brevo lifecycle transactional emails render branded responsive HTML across 4 audience types                      | `firebase/functions/src/communications/emailTemplates.ts`                                                          | `emailTemplates.spec.ts`                                                 | **VERIFIED** |
| **COMM-P1-002**  | Email         | P1       | Brevo API outage queues email for retry without failing or reverting registration state                          | `firebase/functions/src/communications/emailWorker.ts`                                                             | `brevoAdapter.spec.ts`                                                   | **VERIFIED** |
| **DON-P1-001**   | Donations     | P1       | Donations never create tickets or trigger KonfHub ticketing jobs                                                 | `firebase/functions/src/donations/createDonation.ts`, `firebase/functions/src/approvals/paymentApprovalService.ts` | Conditional ticketing check (`entityType === 'ORDER'`)                   | **VERIFIED** |
| **VIS-P1-001**   | OCR           | P1       | Cloud Vision receipt OCR extracts amount, UTR, and status with confidence tiering and manual fallback            | `firebase/functions/src/integrations/vision/ocrParser.ts`                                                          | `ocrParser.spec.ts`                                                      | **VERIFIED** |
| **OBS-P1-001**   | Observability | P1       | Structured logging with correlation ID and automatic redaction of PAN, passwords, and tokens                     | `firebase/functions/src/middleware/correlationId.ts`                                                               | `correlationId.spec.ts`                                                  | **VERIFIED** |
| **MONEY-P1-001** | Accounting    | P1       | All financial arithmetic stored and executed strictly in integer paise; no floating-point rounding errors        | `packages/shared/src/utils/money.ts`                                                                               | `packages/shared/src/utils/money.spec.ts`                                | **VERIFIED** |

---

## 2. Operational Drill Scenarios

### Drill 1: Happy Path Single Registration & Payment

1. User visits `/register` and completes the form.
2. System calculates price (₹499.00 / 49900 paise) on server.
3. System creates order `PIP5-S-XXXX` and redirects to `/pay?ref=...`.
4. User scans SBI UPI QR code and makes payment.
5. User uploads screenshot; OCR pre-fills UTR; user confirms and submits.
6. Slack approval card received by approver channel; approver clicks "Approve".
7. Firestore transaction transitions order to `PAYMENT_VERIFIED` -> `FULFILMENT_PENDING`.
8. KonfHub ticketing worker captures free ticket; Brevo sends confirmation email.
9. User visits `/status/:token` and sees `CONFIRMED` order status with KonfHub ticket reference.

### Drill 2: Duplicate UTR Detection & Rejection

1. User submits receipt with UTR `412345678901`.
2. Another user attempts to submit the same UTR `412345678901`.
3. Firestore transactional lock on `paymentReferences/412345678901` rejects the second attempt with `ALREADY_EXISTS`.
4. Second order is flagged for manual admin review.

### Drill 3: KonfHub Outage & Isolated Recovery

1. Payment is verified in Slack.
2. KonfHub API times out or returns HTTP 500.
3. Order stays in `PAYMENT_VERIFIED` state; ticket job is marked `RETRYING` or `FAILED`.
4. Payment verification is **never** rolled back.
5. Admin views `/admin/tickets`, sees failed ticket, and clicks "Retry".
6. KonfHub succeeds on retry, issues ticket ID, and updates order to `CONFIRMED`.
