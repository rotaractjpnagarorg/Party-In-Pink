# Engineering Standards & Coding Principles — Party In Pink 5.0

## 1. Principles

- **DRY, KISS, YAGNI, SOLID**: Maintain clean domain boundaries, prefer explicit code over cleverness, and avoid speculative abstractions.
- **Fail Fast**: Enforce runtime validation at all trust boundaries (forms, HTTP request bodies, external provider payloads, and spreadsheets).
- **TypeScript Strict Mode**: Zero `any` usage without explicit justification and narrow types.

## 2. Security & Access

- Deny-by-default Firestore and Storage security rules.
- Privileged operations occur strictly within server-side Cloud Functions.
- All secrets are managed in Google Secret Manager; never expose API keys or credentials in client bundles or git repositories.
- Strict formula injection prevention on spreadsheet imports and exports.

## 3. Financial Integrity

- Amounts are stored in integer paise (`100 paise = 1 INR`).
- Client-side prices are never trusted; backend calculates authoritative pricing.
- Approvals use Firestore transactions to prevent double approvals or race conditions.
