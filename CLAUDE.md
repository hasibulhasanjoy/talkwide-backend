# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with nodemon + ts-node (port 5500 by default)
npm run build        # Clean dist/ then compile TypeScript
npm start            # Run compiled output (dist/server.js)
npm run lint         # ESLint on src/**/*.ts
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier on whole repo
```

No test framework is set up yet.

## Architecture

Talkwide is a social media backend using **Express 5**, **TypeScript (ESM)**, **Mongoose**, and **Zod**.

```
src/
  server.ts          → Entry point: loads dotenv, connects DB, starts listening
  app.ts             → Express app: middleware stack, route mounting, 404 catch-all, global error handler
  routes/            → Express routers (e.g. user.route.ts mounted at /api/users)
  controllers/       → Route handlers wrapped in asyncErrorHandler
  services/          → Business logic (auth token flow, mail sending)
  models/            → Mongoose schemas & models (User, ResetToken)
  schemas/           → Zod validation schemas; inferred types exported alongside (e.g. SignUpData)
  interfaces/        → TypeScript interfaces for domain objects (IUser, IResetToken, DecodedToken)
  middlewares/       → validate (Zod), authenticateUser (JWT), globalErrorHandler
  utils/             → AppError class, asyncErrorHandler wrapper, email templates, verifyToken
  config/            → DB connection (mongoose), nodemailer transporter (lazy singleton)
  types/             → Global type augmentations (Express Request.user)
```

### Request flow

Route → `validate(zodSchema)` middleware → controller (wrapped in `asyncErrorHandler`) → service → model.
Protected routes add `authenticateUser` before validation. All thrown errors bubble to `globalErrorHandler`.

### Error handling

- Throw `AppError(message, statusCode)` for operational errors. Third arg `isOperational` defaults to `true`; pass `false` for unexpected/programming errors.
- Wrap every async controller with `asyncErrorHandler` (in `src/utils/asyncErrorHandler.utils.ts`) — it catches promise rejections and forwards to `next`.
- `globalErrorHandler` in `src/middlewares/error.middleware.ts` normalizes known error types (Mongoose CastError/ValidationError/duplicate-key, JWT errors, ZodError) into `AppError` and sends environment-appropriate responses (dev includes stack, prod hides internals for non-operational errors).

### Validation

Zod schemas live in `src/schemas/`. The `validate` middleware (`src/middlewares/validate.middleware.ts`) calls `schema.safeParse(req.body)`, replaces `req.body` with parsed data on success, and throws `AppError` with the first `zod-validation-error` detail on failure.

## Conventions

- **ESM project** (`"type": "module"` in package.json). All local imports use `.js` extensions (e.g. `import User from "../models/user.model.js"`).
- **Nodemon** runs via `node --loader ts-node/esm src/server.ts`.
- Default exports for models, interfaces, utils, and config; named exports for controllers, services, and schemas.
- Passwords are hashed in a Mongoose `pre("save")` hook on the User model (bcrypt, 12 rounds).
- JWT auth: `generateAuthToken()` and `comparePassword()` are instance methods on the User model.
- Password-reset tokens are stored hashed (SHA-256) in the `ResetToken` collection with a TTL index on `expiresAt`.

## Environment Variables

Required in `.env` (not committed):

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `MONGO_URI`            | MongoDB connection string                                                  |
| `PORT`                 | Server port (default 5500)                                                 |
| `JWT_SECRET_KEY`       | Secret for signing JWTs                                                    |
| `JWT_EXPIRES_IN`       | Token lifetime, e.g. `7d`                                                  |
| `NODE_ENV`             | `development` or `production` (controls error response detail)             |
| `EMAIL_HOST`           | SMTP host                                                                  |
| `EMAIL_PORT`           | SMTP port (465 → TLS)                                                      |
| `EMAIL_USERNAME`       | SMTP username                                                              |
| `EMAIL_PASSWORD`       | SMTP password                                                              |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 client ID                                                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret                                             |
| `GOOGLE_CALLBACK_URL`  | OAuth callback URL (e.g. `http://localhost:5500/api/auth/google/callback`) |
| `FRONTEND_URL`         | Frontend application URL for OAuth redirects                               |

## Code Style

- Prettier: double quotes, semicolons, trailing commas (`es5`), 100 char width, 2-space indent.
- ESLint: `typescript-eslint` recommended + type-checked rules, `eslint-config-prettier`, `simple-import-sort` plugin (import/export ordering enforced as warnings).
- Unused vars prefixed with `_` are allowed (`argsIgnorePattern: "^_"`).
