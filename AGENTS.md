# AGENTS.md

## Scope
- Applies to the whole repository.
- Run commands from repo root: `sga-g4-belem`.
- Prefer current code/config over stale docs if they conflict.

## Cursor / Copilot Rules
- No `.cursor/rules/` directory exists.
- No `.cursorrules` file exists.
- No `.github/copilot-instructions.md` exists.
- This file plus repo configs are the active guidance.

## Stack Overview
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui.
- Routing/state/data: Wouter + tRPC + TanStack Query.
- Backend: Express 4 + tRPC 11.
- DB: Drizzle ORM + PostgreSQL (`postgres` driver).
- Tests: Vitest.
- Formatter: Prettier.
- Package manager: pnpm.

## Important Paths
- `client/src/pages`: page-level React screens.
- `client/src/components`: shared components.
- `client/src/components/ui`: shadcn/radix primitives.
- `client/src/lib/trpc.ts`: frontend tRPC client binding.
- `server/routers.ts`: tRPC procedures.
- `server/db.ts`: DB/data access logic.
- `server/_core/*`: server startup, context, tRPC middleware.
- `shared/*`: shared constants/types/errors.
- `drizzle/schema.ts`: schema + inferred Drizzle types.
- `drizzle/*.sql`: migration SQL.

## Build / Run Commands
- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Build production bundles: `pnpm build`
- Start production server: `pnpm start`

## Typecheck / Lint / Format
- Typecheck: `pnpm check`
- Format (write): `pnpm format`
- Format (check): `pnpm exec prettier --check .`
- No ESLint config/script is present in this repo.
- Practical gate: pass `pnpm check` and Prettier.

## Test Commands (Vitest)
- Run all tests: `pnpm test`
- Run one test file: `pnpm test -- server/rooms.progress.test.ts`
- Run a single test by name:
- `pnpm test -- server/rooms.progress.test.ts -t "should calculate correct progress when usage is in progress"`
- Equivalent direct Vitest command:
- `pnpm exec vitest run server/rooms.progress.test.ts`
- `pnpm exec vitest run server/rooms.progress.test.ts -t "test name"`

## Database Commands
- Push schema/migrations: `pnpm db:push`
- `drizzle.config.ts` requires `DATABASE_URL`.
- DB-backed tests/scripts require an accessible Postgres DB.
- Keep schema (`drizzle/schema.ts`) and migrations in sync.

## Environment Notes
- Environment is loaded with `dotenv/config`.
- Key vars used frequently: `DATABASE_URL`, `JWT_SECRET`.
- Other optional vars exist (`OAUTH_SERVER_URL`, `OWNER_OPEN_ID`).
- Dev can show warnings for unset analytics placeholders; do not confuse with functional failures.

## Formatting Conventions
- Follow `.prettierrc` strictly.
- Semicolons enabled.
- Double quotes.
- 2-space indentation.
- Print width 80.
- Trailing commas (`es5`) where formatter applies.
- LF line endings.

## Import Conventions
- Prefer frontend aliases where appropriate:
- `@/*` => `client/src/*`
- `@shared/*` => `shared/*`
- Use `import type` for type-only imports when practical.
- Keep import ordering consistent with local file style.
- Avoid unrelated import reordering in the same patch.

## Type Conventions
- TypeScript is `strict`; keep strict-safe changes.
- Prefer explicit/real types over `any`.
- If uncertain, use `unknown` and narrow.
- Reuse Drizzle inferred types (`InsertX`, `X`) from schema.
- Validate request input with Zod at tRPC boundaries.
- Preserve exact enum/string literal values used by DB and UI.

## Naming Conventions
- Components/pages: PascalCase (`Dashboard.tsx`).
- Helpers/util files: lower-case or dotted (`auth.helpers.ts`).
- Functions/variables: camelCase.
- Constants: UPPER_SNAKE_CASE for true constants.
- tRPC procedure naming pattern: `list`, `getById`, `create`, `update`, `delete`.

## Backend Coding Guidelines
- Keep routers thin: input validation + orchestration only.
- Keep query/mutation internals in `server/db.ts`.
- Use `protectedProcedure` for protected operations.
- Keep error messages specific and actionable.
- Do not silently change auth/permission behavior.
- Preserve DB-unavailable fallback behavior in touched modules.

## Error Handling Guidelines
- In tRPC layers, use `TRPCError` for user-facing API failures.
- In lower layers, throw `Error` for invariants/infra failures.
- Log unexpected failures with context (e.g. `[Database] ...`).
- Do not swallow errors unless the existing pattern intentionally does.
- Avoid vague messages like "something went wrong" in internal code.

## Frontend Coding Guidelines
- Common page pattern: `useQuery` + `useMutation` + `toast` + `refetch`.
- Match existing patterns in the file before introducing abstractions.
- Prefer shared UI from `client/src/components/ui`.
- Keep UI text consistent with surrounding language (mostly Portuguese).
- Preserve accessible dialog usage (`DialogTitle`/`DialogDescription`).

## Data / Domain Rules
- Date/time is often stored as strings; confirm format before changes.
- Keep status/enums exact, e.g. `em_progresso`, `REPOR_ESTOQUE`, `ESTOQUE_OK`.
- Do not rename domain literals without explicit migration/data plan.
- For create failures, verify foreign keys and seed assumptions first.

## Testing Guidance for Agents
- Prefer targeted tests for changed modules.
- For router edits, test validation and DB path.
- For dashboard cards/charts, verify data source matches metric intent.
- For time/date logic, add deterministic tests with fixed timestamps.
- Keep tests in `server/**/*.test.ts` or `server/**/*.spec.ts`.

## Workflow Guidance
- Make minimal, localized diffs.
- Avoid broad refactors mixed with bug fixes.
- Run `pnpm check` after TypeScript-heavy edits.
- Run relevant Vitest file(s) for behavior changes.
- Run formatting before finalizing multi-file edits.

## Quick Command List
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm check`
- `pnpm format`
- `pnpm exec prettier --check .`
- `pnpm test`
- `pnpm test -- server/<file>.test.ts`
- `pnpm test -- server/<file>.test.ts -t "<test name>"`
- `pnpm db:push`
