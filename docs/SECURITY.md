# Security Policy & Controls — Party In Pink 5.0

## 1. Trust Boundaries

- **Public Client**: All client submissions (registration payloads, receipts, bulk workbooks) are untrusted.
- **External Providers**: Responses from Slack, KonfHub, Brevo, and Vision are parsed and validated against expected schemas before processing.

## 2. Secrets Management

- All sensitive tokens (`KONFHUB_*`, `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET`, `BREVO_API_KEY`, `BREVO_WEBHOOK_SECRET`) are read from Google Secret Manager and injected only into the functions that use them.
- Provider credentials are absent from the current client and server source tree. Previously used credentials must be rotated before launch because removing a value from the current tree does not remove it from Git history.

## 3. Concurrency & Protection against Replay

- Slack interactive webhooks verify signature header (`x-slack-signature`) and timestamp (`x-slack-request-timestamp`) within 5 minutes.
- Slack approvals require the configured workspace ID and an explicit allowlist of stable Slack user IDs.
- Brevo webhooks require a shared-secret header and reconcile delivery events by exact provider message ID.
- Normalized UTRs must be unique in `paymentReferences` collection.
- Dual approval attempts (Slack + Admin) resolve safely inside a Firestore transaction.
- Admin callables require Firebase Authentication custom-role claims; the UI role is never treated as authorization.
- Receipt uploads are create-only, image-only, limited to 5 MB, private to payment approvers, and revalidated by the backend before OCR or submission.

## 4. Production Hardening Requirement

Enable Firebase App Check enforcement for Cloud Functions, Firestore, and Storage after configuring the production web provider and validating the debug-token workflow in staging. This is an external Firebase-console control and is not proven by local source tests.
