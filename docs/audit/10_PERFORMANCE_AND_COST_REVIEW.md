# Performance and Cost Review

Production build succeeds but reports a 1,207.88 kB main JS chunk and 718.82 kB Firebase vendor chunk (gzip 334.12 kB and 176.90 kB). Route-level lazy loading exists for bulk/admin pages. Functions use bounded provider chunks, leases and scheduled limits.

No staging load test, Lighthouse run, Cloud Monitoring data, billing export or provider quota evidence was available. The ₹1,000/month target therefore remains an estimate/operational requirement, not a measured result. Bulk reservation and OCR/session creation need abuse quotas before production.
