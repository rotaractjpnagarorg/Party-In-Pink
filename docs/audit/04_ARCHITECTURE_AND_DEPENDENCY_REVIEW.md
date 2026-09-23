# Architecture and Dependency Review

The source implements a React/TypeScript/Vite/Tailwind SPA on Netlify and a Firebase Functions 2nd Gen modular monolith using Firestore, Auth, Storage, Scheduler, Secret Manager, Vision, Slack, KonfHub and Brevo adapters. Financial decisions remain server-side and transactional.

Observed deviations: current ticket processing is Firestore-trigger/scheduled rather than the README's Cloud Tasks description; live deployment configuration is absent; the web bundle contains a 1.2 MB main chunk and a 719 kB Firebase vendor chunk. These are documented risks, not silently “fixed”. No embedded provider credential was found.
