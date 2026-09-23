# Frontend and UX Audit

Routes and public flows were read and covered by React Testing Library. Donation copy now explicitly separates contribution from admission. Sponsor regression tests pass after wrapping the page in `EventProvider`.

Local limitations: no browser automation, Lighthouse, axe, real mobile viewport, PWA install/update, or production console run was available. Build output warns of oversized JS chunks. App Check site-key configuration is absent in the example environment and must be verified in Netlify/Firebase before release.
