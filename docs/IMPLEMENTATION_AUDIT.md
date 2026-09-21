# Party In Pink 5.0 Implementation Audit

Audit date: 21 September 2026

Scope: every file in `docs/`, the React application, shared domain package, Firebase Functions, Firestore/Storage rules, indexes, tests, and CI configuration. “Implemented” below means present and locally verified. It does not mean deployed or proven against live provider accounts.

## Executive Result

The ticket-registration and donation-payment workflows are implemented end to end in source. Local type-checking, unit/component tests, Firestore/Storage rules tests, a complete Functions emulator journey, lint, dependency audit, and production builds are the release gate. Live operation still depends on production credentials, approved event/legal facts, deployment, Firebase App Check registration, and real-provider canaries.

## Implemented and Locally Verified

| Area                | Status | Implemented behavior and evidence                                                                                                                                                                                                                                       |
| ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public event/PWA    | Done   | React/Vite SPA, manifest, production service-worker registration, responsive public routes, status lookup, legal pages, and Netlify SPA routing.                                                                                                                        |
| Single registration | Done   | Runtime validation, server-authoritative event state/price, order plus attendee creation, opaque status token, atomic capacity reservation, 30-minute unpaid expiry/release, and audit record.                                                                          |
| Bulk registration   | Done   | Official XLSX template, formula sanitization, required-column and duplicate validation, minimum five attendees, server duplicate checks, deterministic attendee IDs, resumable commit hash, atomic capacity reservation, expiry/release, and chunked writes.            |
| Donation intent     | Done   | Validated donor/contact/PAN fields, configured minimum amount, opaque status token, audit record, and an explicit invariant that donations never create tickets.                                                                                                        |
| Payment session     | Done   | Order/donation token lookup, server-owned amount, UPI URI and bank details, atomic session-to-entity binding, active-session reuse, and expiry.                                                                                                                         |
| Evidence/OCR        | Done   | PNG/JPEG upload limits, create-only private receipt rules, object metadata/existence checks, Vision OCR prefill, manual UTR fallback, fresh transaction revalidation, and normalized UTR uniqueness lock.                                                               |
| Payment approval    | Done   | Signed Slack action handling and authenticated admin approval converge on one transactional service; approve/reject/review races are guarded; order approval queues tickets; donation approval queues acknowledgement only.                                             |
| Ticket fulfilment   | Done   | Auth-gated admin retry, trigger and scheduled worker, worker lease, verified-payment precondition, KonfHub 20-person chunks, partial completion checkpoints, `REVIEW_REQUIRED` handling for ambiguous results, attendee/order completion, and per-recipient email jobs. |
| Donation completion | Done   | Approval updates donation status, queues donor acknowledgement, exposes donation-aware status copy, and supports admin resend without issuing a ticket.                                                                                                                 |
| Email lifecycle     | Done   | Brevo adapter fails closed without secrets, job leases, deterministic communications records, exponential retries, scheduled recovery, delivery webhook reconciliation, failed-job retry, contact correction, and resend controls.                                      |
| Admin console       | Done   | Firebase-auth role claims, role-filtered navigation, server authorization on privileged callables, payment receipt review, approve/reject/review, ticket retry, email retry, contact repair, confirmation resend, reports, and CSV formula neutralization.              |
| Security/data rules | Done   | Deny-by-default Firestore rules, no client mutation of financial/job records, restricted receipt reads, create-only bounded receipt uploads, Slack signature/replay/team/user checks, Brevo secret verification, and exact message reconciliation.                      |
| Operations          | Done   | Health endpoint, stale-session sweep, daily summary, required composite indexes, event seed script, admin-role seed script, CI gates, and deployment/runbook documentation.                                                                                             |

## Actual Local End-to-End Workflow Result

The Firebase Auth, Functions, Firestore, and Storage emulators were run together against the callable endpoints and background triggers. The journey passed:

- Single order creation, capacity reservation, payment session, manual UTR evidence, admin approval, verified public status, and ticket-job creation.
- Donation creation, payment session, manual UTR evidence, admin approval, and verified donation status, with no ticket job.
- Bulk draft, five deterministic attendees, replay-safe commit, one capacity reservation, and payment-session creation.
- Final capacity reconciliation: six registered or reserved seats and one confirmed seat.
- Missing KonfHub credentials sent the ticket job to `REVIEW_REQUIRED`; missing Brevo credentials sent all three email jobs to `RETRYING`, proving both integrations fail closed without losing work.

## Important Repairs Completed During This Audit

- Removed hard-coded KonfHub credentials and made every provider integration fail closed when required configuration is absent.
- Added server-side role enforcement to approval, retry, receipt, resend, and contact-repair operations.
- Bound receipt submissions to the exact entity, payment session, amount, state, expiry, and storage path, then rechecked the binding in the write transaction.
- Made payment-session creation atomic to prevent parallel orphan sessions.
- Fixed Firestore transaction read/write ordering in payment approval and contact repair; emulator tests now exercise order and donation approval.
- Locked approval to the entity's current payment session so a superseded session cannot change financial state.
- Added transactional capacity reservations, a 30-minute unpaid-registration expiry, and atomic release/confirmation accounting so abandoned registrations cannot hold seats indefinitely and paid users are not oversold.
- Made completed bulk commits replay-safe so a repeated payload cannot roll a submitted payment backward.
- Enforced active admin profiles in both callable authorization and Firestore rules; stale role claims no longer preserve access after deactivation.
- Bound anonymous receipt creation to an existing awaiting-payment session and retained create-only, private, size/type-limited storage rules.
- Added partial ticket checkpoints, worker leases, review-required handling, and scheduled retries so verified payments are not lost during provider failures.
- Checkpointed successful KonfHub chunks immediately, refreshed leases per chunk, and routed expired in-progress jobs to human reconciliation instead of automatic replay.
- Added donation-aware public status and fixed the manual status-search payment link to use the returned opaque status token.
- Replaced the vulnerable `xlsx` dependency with `exceljs`; production dependency audit now has no high or critical findings.
- Added HTML escaping for user-controlled email fields and CSV formula neutralization for admin exports.
- Added stable Brevo idempotency keys and monotonic webhook state transitions to reduce duplicate delivery and out-of-order status regression.
- Added App Check enforcement to every public write/cost-bearing callable, with an emulator-only bypass for repeatable local testing.
- Added XLSX compressed/uncompressed size, entry, row, and column limits; attendee-count validation now occurs before per-row processing.
- Added once-per-object OCR claims and result caching to prevent repeated Vision charges for the same receipt.
- Added transactional payment-session expiry and automatic recovery of email jobs stranded in an expired sending lease.
- Configured the supplied SBI/UPI payment details and added prominent pre-payment warnings that these accounts do not provide 80G certificates.
- Corrected stale documentation that referred to Cloud Tasks and a ₹499 pass.

## Pending Before a Production Launch

These items require external credentials, business confirmation, or deployment authority; they cannot be truthfully marked complete from local code alone.

| Priority     | Pending item                                                                                                                                                                                     | Completion evidence required                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Blocker      | Rotate every KonfHub/Slack/Brevo credential that may have existed in Git history.                                                                                                                | New secrets issued, old credentials revoked, and rotation recorded.                                                                  |
| Blocker      | Confirm event facts and seed production: date/time, venue, capacity, ₹199/₹149 prices, support contacts, feature flags, and approval to use the supplied personal savings account.               | Organizer/finance sign-off plus verified `events/PIP5` document.                                                                     |
| Blocker      | Define the separate lawful 80G payment/receipt route. The displayed UPI and bank account explicitly do not provide 80G certificates. Automated formal 80G receipt generation is not implemented. | Written legal/finance approval and a tested contact-led receipt process.                                                             |
| Blocker      | Provision all Secret Manager values and runtime parameters listed in `DEPLOYMENT.md`.                                                                                                            | Deployed Function revisions show every required secret/parameter binding.                                                            |
| Blocker      | Deploy Firestore rules/indexes, Storage rules, Functions, and the Netlify frontend.                                                                                                              | Successful deployment logs and version identifiers.                                                                                  |
| Blocker      | Register the web app with reCAPTCHA Enterprise, set `VITE_FIREBASE_APPCHECK_SITE_KEY`, deploy, and validate App Check.                                                                           | Legitimate browser flow passes while missing/invalid tokens are rejected by Functions, Firestore, and Storage enforcement.           |
| Blocker      | Run real-provider canaries: ₹1 payment, Slack approval, Vision OCR, KonfHub capture, Brevo delivery/webhook.                                                                                     | One reconciled order and one donation with provider IDs, audit logs, and received emails; test records then voided or labelled.      |
| Blocker      | Run production-domain browser smoke tests on desktop and mobile.                                                                                                                                 | Registration, bulk upload, donation, payment evidence, status, admin recovery, and accessibility checks pass on the deployed domain. |
| Operational  | Configure budgets, alerts, retention, backups, and named on-call owners.                                                                                                                         | Console screenshots/export plus an approved incident roster.                                                                         |
| Quality debt | Resolve remaining moderate transitive dependency advisories and existing explicit-`any` lint warnings where upstream compatibility permits.                                                      | Clean advisory review and reduced warning baseline; there are currently no high/critical production advisories.                      |

## Definition of Production-Ready

Production-ready means every local gate passes, every blocker above has external evidence, and an actual paid-registration canary and donation canary complete the full sequence: create record → create payment session → submit evidence → approve → issue ticket only for registration → deliver email → reconcile webhook → display public status → exercise admin recovery.
