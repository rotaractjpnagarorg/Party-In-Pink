# Security Audit

## Remediated

- Registration admins can no longer mutate donation contacts or resend donation acknowledgements.
- Mixed `emailJobs`/`communications` reads are constrained by entity type and role.
- Manual email retry is limited to failed jobs and audited.
- Ticket/donation confirmation resend checks authoritative verification/fulfilment state.
- PAN is excluded from donation email templates.
- Receipt OCR rejects MIME-spoofed/truncated content by byte signature.

## Outstanding

- `F-001` High: unauthenticated bulk reservation/capacity exhaustion remains.
- Production App Check enforcement, IAM, secrets, provider webhook configuration and budgets are external evidence gaps.
- Attachment URLs from external KonfHub responses require provider canary confirmation.
