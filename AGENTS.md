# Repository Guidelines

## Project Structure & Module Organization

Saharah uses Next.js App Router; a separate Express backend owns database access.

- `src/app/`: pages, layouts, route handlers, and global styles; `(auth)` groups signin/signup routes.
- `src/features/auth/`: authentication forms, error handling, and integration documentation.
- `src/components/`: shared components; `ui/` contains shadcn primitives.
- `src/schema/`, `src/context/`, `src/types/`: validation, shared state, and types.
- `src/lib/` and `src/utils/`: backend helpers and server token access.
- `public/`: static assets.

## Build, Test, and Development Commands

Use Node.js 20.9+; install with `npm ci`.

- `npm run dev`: compile/watch Tailwind and run Next.js at `http://localhost:3001`.
- `npm run build`: compile styles and create the production build.
- `npm start`: serve the production build on port 3001.
- `npm run lint`: run Next.js/TypeScript ESLint rules.
- `npm run typecheck`: generate route types and check TypeScript.
- `npm run styles`: compile `src/app/globals.css`; `tailwind.generated.css` is generated output.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, and semicolons. Use PascalCase components, camelCase functions, and kebab-case component filenames (`signin-form.tsx`). Preserve schema names like `signupSchema.ts`. Prefer `@/` imports. Use Client Components for interactive forms and server-only backend helpers. ESLint is configured; no dedicated formatter exists.

## Testing Guidelines

No test framework, test directory, naming convention, or coverage threshold is configured. Run lint, typecheck, and build before submitting code. Manually verify affected routes, including validation, backend errors, redirects, and sessions for authentication changes. Record results in the PR.
-open the project in a browser and test it directly , test every case possiple in browser.
-if there is any errors make a report and return the errors to the user them send it to hi and let him handle the errors like he wants.

## Commit & Pull Request Guidelines

History uses short imperative subjects (`add tanstack query`), without a formal convention. Keep commits focused. PRs should explain changes, link relevant issues, list verification and configuration changes, and include UI screenshots.

## Security & Configuration

Use `.env.example` to configure a local `.env`. Keep secrets out of commits and `NEXT_PUBLIC_` variables. Backend access tokens must remain server-only. Consult `src/features/auth/README.md` before changing authentication contracts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
