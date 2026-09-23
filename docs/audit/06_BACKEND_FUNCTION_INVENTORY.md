# Backend Function Inventory

Public callables cover registration, bulk upload/commit, donations, payment sessions/evidence/OCR/status. Privileged callables cover approvals, contact repair, receipt URLs, ticket/email retry and confirmation resend. Firestore triggers enqueue ticket/email work; scheduled sweeps retry bounded work and expire reservations.

Critical invariant controls observed: integer paise/server event config, payment-session/entity/status-token binding, normalized UTR locks, transaction-based approvals, ticket leases/checkpoints, email idempotency keys and webhook correlation. Remaining concern: unauthenticated bulk reservation abuse.
