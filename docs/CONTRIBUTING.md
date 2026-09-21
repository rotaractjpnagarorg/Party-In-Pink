# Contributing Guide — Party In Pink 5.0

## Development Workflow

1. Ensure Node.js 22+ and npm 10+ are installed.
2. Install workspace dependencies: `npm install`
3. Verify typechecking: `npm run typecheck`
4. Run tests: `npm run test`
5. Format code: `npm run format`

## PR Quality Checklist

- [ ] No `any` types in TypeScript code.
- [ ] Runtime schema validation added with Zod.
- [ ] Financial calculations adhere to integer paise rule.
- [ ] Associated unit tests added with corresponding Test ID (`<DOMAIN>-<PRIORITY>-<NNN>`).
