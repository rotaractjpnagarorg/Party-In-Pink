# Test Coverage and Results

Executed successfully on 2026-09-23:

- `npm test`: shared 27 tests, functions 44 tests, web 11 tests — **82 passed, 0 failed**.
- `npm run typecheck` — passed.
- `npm run lint` — passed with 45 existing `no-explicit-any` warnings, 0 errors.
- `npm run build` — passed; Vite warns about large chunks.
- `npm run test:rules` — passed: 11 emulator tests across Firestore/Storage/workflow.
- Focused new receipt and KonfHub tests — passed.

`npm run format:check` fails because 137 repository files have pre-existing Prettier drift; only touched files were formatted to avoid a mass formatting rewrite. Formal line/branch coverage was not configured or measured.
