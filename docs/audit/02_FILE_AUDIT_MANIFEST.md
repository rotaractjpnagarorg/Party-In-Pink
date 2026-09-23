# File Audit Manifest

The tracked first-party inventory contains **148 files / approximately 33,897 lines** across `apps`, `firebase`, `packages`, `tests`, documentation and deployment configuration (counted with PowerShell on 2026-09-23). Generated dependencies, `node_modules`, build output and binary assets were excluded from line review and are not treated as first-party source.

| Area | Reviewed scope | Evidence / disposition |
|---|---|---|
| Web | React routes, pages, components, contexts, Firebase client, PWA, tests | Read and exercised with Vitest; no browser automation available |
| Functions | Callable functions, triggers, scheduled jobs, domain services, integrations, scripts, tests | Read and exercised with Vitest/typecheck/build |
| Data security | Firestore rules, Storage rules, indexes, shared schemas/types | Emulator rules suite passed |
| Shared | constants, types, schemas, money/XLSX utilities and tests | Unit suite passed |
| Operations | README, docs, Netlify/Firebase config, package manifests | Deployment evidence remains external |

Exact per-file metadata is reproducible with `git ls-files` plus `Get-Content | Measure-Object -Line`. No file was deleted in this pass. Exhaustive line-by-line certification of generated/vendor files, binary assets and live provider consoles is explicitly excluded.
