# Deployment Runbook & Environment Topography — Party In Pink 5.0

## Environments

1. **Local Development**:
   - Frontend: `npm run dev --workspace=apps/web` (Port 3000)
   - Firebase Emulator: `firebase emulators:start` (Auth: 9099, Functions: 5001, Firestore: 8080, Storage: 9199, UI: 4000)
2. **Staging**:
   - Frontend: Netlify Staging Preview
   - Backend: Staging Firebase Project, Staging Slack Channel, Test KonfHub Free Event
3. **Production**:
   - Domain: `pip.rotaractjpnagar.org`
   - Production Firebase Blaze Project

## Release Gates

- All P0 tests pass.
- Typecheck, lint, format check, and unit tests pass.
- Firestore and Storage rules tests pass.
- No high/critical vulnerability in dependencies.

## Required Function Secrets and Parameters

Set these production secrets before deploying Functions:

The supplied KonfHub dashboard URL identifies `KONFHUB_EVENT_ID` as
`9f4df047-f684-4ded-af0d-96e8f0459604`. The API key, internal ticket IDs, and any ticket access codes must still be copied from the authenticated KonfHub organizer/API settings.

```bash
firebase functions:secrets:set KONFHUB_API_KEY
firebase functions:secrets:set KONFHUB_EVENT_ID
firebase functions:secrets:set KONFHUB_INTERNAL_BULK_TICKET_ID
firebase functions:secrets:set KONFHUB_INTERNAL_FREE_TICKET_ID
firebase functions:secrets:set KONFHUB_ACCESS_CODE_BULK
firebase functions:secrets:set KONFHUB_ACCESS_CODE_FREE
firebase functions:secrets:set SLACK_WEBHOOK_URL
firebase functions:secrets:set SLACK_SIGNING_SECRET
firebase functions:secrets:set BREVO_API_KEY
firebase functions:secrets:set BREVO_WEBHOOK_SECRET
```

Configure the non-secret runtime parameters `SLACK_TEAM_ID`, `SLACK_APPROVER_USER_IDS` (comma-separated Slack user IDs), `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and `PUBLIC_WEB_URL` in the production Firebase environment. Rotate all provider credentials that were ever committed to Git before using the production system.

After deployment, configure the Slack interaction URL and Brevo webhook URL to the deployed `asia-south1` endpoints. The Brevo sender/domain must be verified before the email canary.
