# Requirements Traceability

| Requirement family | Implementation | Tests / verification | Status |
|---|---|---|---|
| Public React/Vite/PWA routes | `apps/web/src/App.tsx`, pages, service worker | Web Vitest + production build | Implemented locally; browser/deployment unverified |
| Single registration and server pricing | `createSingleOrder.ts`, shared schemas, `SingleRegisterPage.tsx` | Function/schema tests, workflow emulator | Implemented and locally verified |
| Bulk XLSX validation and fulfilment | `validateBulkUpload.ts`, `commitBulkAttendees.ts`, `xlsxParser.ts` | XLSX/unit/workflow tests | Implemented; abuse quota gap remains |
| Donation independent of tickets | `createDonation.ts`, approval service, donation UI | Approval/workflow tests | Implemented and locally verified |
| PiP Pay/manual verification | payment session/evidence/approval services | payment and approval tests | Implemented; live bank/Slack evidence blocked |
| OCR/manual fallback | `receiptOcrService.ts`, parser, payment UI | parser + new signature tests | Implemented locally; Vision quota/canary unverified |
| Role separation | Firestore rules and admin callables | rules emulator; typecheck | Remediated and locally verified |
| KonfHub fulfilment/email | ticket worker, adapter, Brevo worker | adapter/unit/workflow tests | Source-backed; provider canary blocked |
| Reporting/refunds/operations | admin pages, scheduled sweeps, docs | No complete live/reporting E2E | Partially verified |

The seven supplied specification books were not present as discrete repository documents; the mandate text and current docs were used as available references. Unsupported business/deployment claims remain blocked rather than inferred.
