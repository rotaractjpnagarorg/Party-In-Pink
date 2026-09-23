# Findings and Remediation

| ID | Severity | Finding | Status / evidence |
|---|---|---|---|
| F-001 | High | Public bulk reservation can fill event capacity without identity/quota | **Open**; fix requires product/rate-limit decision and emulator abuse test |
| F-002 | High | Registration admin crossed donation finance boundary | **Fixed** in rules and callable role gates; local type/rules/tests pass |
| F-003 | Medium | Confirmation resend bypassed payment/fulfilment state | **Fixed** with authoritative state checks and audit record |
| F-004 | Medium | Receipt upload trusted attacker MIME metadata | **Fixed in OCR sink** with byte signatures; Storage still accepts metadata-labeled bytes until backend analysis |
| F-005 | Medium | KonfHub URL shape could omit email ticket link | **Hardened** with response-shape normalization; live provider canary still required |

Every open item must be resolved or explicitly accepted before release; no test was weakened to hide a defect.
