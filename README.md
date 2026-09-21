# Party In Pink 5.0 (PiP 5.0)

Production platform for **Party In Pink 5.0**, the flagship breast cancer awareness event organized by the **Rotaract Club of Bangalore JP Nagar** (RI District 3191).

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, PWA on Netlify.
- **Backend**: Firebase Cloud Functions 2nd Gen (TypeScript) on Firebase Blaze.
- **Database**: Cloud Firestore.
- **Payments**: PiP Pay (Direct UPI and direct SBI bank transfer; integer paise arithmetic).
- **Verification**: Cloud Vision OCR prefill + Slack Free App / Admin Dashboard dual manual approval.
- **Ticketing**: Free KonfHub Event Capture API v2 via Cloud Tasks.
- **Email**: Brevo Free API transactional lifecycle messages.

## Workspace Layout

```
Party-In-Pink/
  apps/web/               # React + Vite + Tailwind CSS frontend
  firebase/functions/     # Cloud Functions 2nd Gen backend
  packages/shared/        # Shared types, Zod schemas, constants
  docs/                   # Specifications, runbooks, and guidelines
```

## Quick Start

```bash
# Install dependencies across all workspaces
npm install

# Run typechecks
npm run typecheck

# Run test suites
npm run test

# Run frontend development server
npm run dev --workspace=apps/web
```
