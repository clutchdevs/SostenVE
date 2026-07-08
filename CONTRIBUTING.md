# Contributing — PPV

Conventions that every contributor and every pull request must follow. Several of these are
**security-critical** for a system that handles clinical data of people in crisis.

## Language: code in English, product content in Spanish
- **Code is 100% English:** variable, function, class and file names, comments and commit messages.
  No mixed identifiers ("Spanglish"), no literal Spanish-grammar translations.
- **User-facing content is Spanish (es-VE):** UI text, on-screen error messages and clinical tags.
  The audience is Venezuelan.
- Separation rule: **code = English, product content = Spanish.**

## Commits
- [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`.
- Atomic commits: one logical change each. Do not bundle unrelated changes.

## Configuration
- Non-secret values (thresholds, SLA, crisis lines, CORS origins, etc.) go in
  `config/app.config.yml`, versioned and environment-scoped.
- `.env` holds **only** secrets (see `.env.example`); never commit a real `.env`.
- No module reads the YAML directly — everything consumes the validated config singleton
  (`apps/api/src/config`).

## Security (non-negotiable)
- **Validate all input at the API edge** with a Zod schema in the controller before reaching
  `application`/`domain`. Never trust that the frontend already validated.
- **No string concatenation in SQL**, ever — not even in migrations or ad-hoc reports. All database
  access goes through the official Supabase client/query builder.
- **Never log PII or clinical data.** Logging goes through the central redacting logger
  (`apps/api/src/shared/logger.ts`). `console.*` is banned in `apps/api/src` (enforced by ESLint);
  never log `Case`/`ClinicalNote`/`Volunteer` objects raw.
- **Dependencies:** the lockfile is committed; security-critical libraries (hashing, JWT, validation)
  are pinned to exact versions. CI fails on high/critical advisories in production dependencies
  (`npm audit --omit=dev --audit-level=high`); Dependabot tracks the rest.

## Secrets
- Secrets live **only** as environment variables: Vercel project settings in production, a local
  `.env` (gitignored) in development. Never commit a real `.env`. Only `.env.example` (empty values)
  is versioned.
- **Rotate periodically:** `JWT_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` and the database
  credentials can be rotated freely (invalidate sessions / update Vercel env, then redeploy).
- **Rotate with care — these affect existing data:**
  - `PSEUDONYMIZATION_SALT`: rotating it changes future pseudonym ids, breaking the link to PII
    stored under the old salt. Requires a migration plan if data exists.
  - `ENCRYPTION_KEY`: rotating it makes previously encrypted clinical columns undecryptable. Requires
    re-encryption of existing rows. Never rotate in place on a database with real data without a plan.

## API versioning
- Every HTTP route is prefixed with `/api/v1/...` from the very first endpoint. No unversioned
  routes, including internal ones (cron, future webhooks). See section 1.1 of the execution plan.

## The non-negotiable principle
- Crisis lines must always be shown for high-risk cases, **before and independently** of any
  assignment, and must not depend on a human reviewing the platform in time. No change may break
  this. Reviewers must check it explicitly before merging to `main`.
