# 🚀 Talkwide Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express%205-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose 9](https://img.shields.io/badge/Mongoose%209-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Passport.js](https://img.shields.io/badge/Passport.js-34E0A1?style=for-the-badge&logo=passport&logoColor=black)](https://www.passportjs.org/)

> A scalable, production-grade social discussion platform backend inspired by Reddit. Built with modern TypeScript (ESM), Express 5, Mongoose 9, and Zod runtime schema validation — featuring nested comment trees, community moderation, unified search, and dual-strategy authentication.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live API](#-live-api)
- [API Documentation](#-api-documentation)
- [Key Engineering Highlights](#-key-engineering-highlights)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
  - [1. Authentication & Security](#1-authentication--security)
  - [2. Multi-Type Post Management](#2-multi-type-post-management)
  - [3. Reddit-Style Feed & Ranking Engine](#3-reddit-style-feed--ranking-engine)
  - [4. Voting, Karma & Bookmarking](#4-voting-karma--bookmarking)
  - [5. Nested Comment Trees](#5-nested-comment-trees)
  - [6. Communities & Moderation](#6-communities--moderation)
  - [7. Unified Search](#7-unified-search)
- [Database Schema & Indexing](#-database-schema--indexing)
- [API Reference](#-api-reference)
  - [Auth & Account Routes](#auth--account-routes)
  - [Post & Feed Routes](#post--feed-routes)
  - [Comment Routes](#comment-routes)
  - [Community Routes](#community-routes)
  - [Search Routes](#search-routes)
  - [User Profile & Engagement Routes](#user-profile--engagement-routes)
- [Design Decisions & Best Practices](#-design-decisions--best-practices)
- [Getting Started](#-getting-started)
- [Author](#-author)
- [License](#-license)

---

## 🌟 Overview

**Talkwide** is a forum and social media backend engineered for high performance, end-to-end type safety, and clean software architecture. It implements Reddit-style community interactions including multi-format content creation (text, links, images via Cloudinary CDN), infinitely nestable comment threads, community spaces with role-based moderation, time-decay Hot feed ranking, atomic voting with dynamic karma calculation, a unified user/community search pipeline, and dual-strategy authentication (Local JWT + Google OAuth 2.0).

---

## 🌐 Live API

Talkwide is deployed and publicly live — try it out without any local setup:

**Base URL:** <https://talkwide-api.onrender.com>

Example request:

```bash
curl "https://talkwide-api.onrender.com/api/posts?sort=hot&limit=5"
```

> ℹ️ Hosted on Render's free tier, the instance spins down after periods of inactivity. If the first request is slow or times out, give it ~30–60 seconds to wake up and try again.

---

## 📚 API Documentation

The API is fully documented with an interactive OpenAPI 3.0 reference — no need to run the code or hit endpoints manually to understand how it works.

| Resource                                                            | What it is                                                                                                          |
| :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| [Live interactive docs](https://talkwide-api.onrender.com/api-docs) | Browsable Redoc reference served directly by the API — every endpoint, request/response examples, auth requirements |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)                    | Human-readable walkthrough: every endpoint, inputs, and exactly what comes back                                     |
| [`docs/openapi.yaml`](docs/openapi.yaml)                            | Machine-readable OpenAPI 3.0 spec — import into Postman/Insomnia, or lint with Redocly                              |
| [`docs/docs.html`](docs/docs.html)                                  | Standalone Redoc page for static hosting (e.g. GitHub Pages) — serve the folder over http(s)                        |

The interactive docs are served straight from the app itself, so they stay in sync with whatever is deployed:

```
https://talkwide-api.onrender.com/api-docs          → interactive Redoc UI
https://talkwide-api.onrender.com/api-docs/openapi.yaml → raw OpenAPI 3.0 spec
```

---

## ⚡ Key Engineering Highlights

- **End-to-End Type Safety**: Pure TypeScript (ESM) with static typing inferred directly from Zod runtime validation schemas.
- **Dual Authentication Architecture**: Supports both traditional server-side OAuth redirect flows (Passport.js) and client-side Google ID token verification (`google-auth-library`) for SPAs and mobile applications.
- **Reddit-Like Hot Feed Algorithm**: Dynamic score decay balancing post recency and user engagement:
  $$\text{HotScore} = \text{score} + \frac{\text{postAgeInSeconds}}{45000}$$
- **Materialized-Path Comment Trees**: Every comment stores its full root-to-parent `ancestors` chain, letting entire reply subtrees load or cascade-delete in a single query instead of recursive traversals.
- **Zero-Disk Media Stream Pipeline**: Multipart file uploads handled entirely in-memory using Multer and streamed directly to Cloudinary CDN, preventing disk bottlenecks and container accumulation.
- **Atomic Operations & Karma Sync**: Single-transaction vote toggling with automatic karma adjustment on the post author's profile.
- **Unified Aggregation Search**: A single endpoint resolves users and communities via parallel aggregation pipelines with case-insensitive server-side matching.
- **Automated Data Hygiene**: Auto-expiring password reset tokens and pending email verifications backed by MongoDB TTL indexes and SHA-256 cryptographic hashing.
- **Layered Error Handling**: Centralized error interceptor mapping Mongoose CastErrors, duplicate key violations (`11000`), JWT invalidations, and Zod formatting errors into normalized JSON responses.
- **Hardened HTTP Surface**: Security headers (Helmet), per-route rate limiting, NoSQL operator injection sanitization, HTTP parameter pollution (HPP) protection, and strict body size caps on every incoming request.

---

## 🏗 System Architecture

Talkwide adheres to **Layered Clean Architecture** principles, enforcing separation of concerns across middleware, controllers, services, and models. Complex domains are further decomposed into focused service sub-modules (e.g. `services/community/` splits CRUD, membership, roles, moderation, and posts logic).

```
                    Client HTTP / REST Requests
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      MIDDLEWARE PIPELINE                          │
│  • Helmet Security Headers & CORS Allowlist                       │
│  • Rate Limiting (Global + Stricter Auth Buckets)                 │
│  • NoSQL Injection Sanitizer & HPP Protection                     │
│  • Morgan Logging (dev: colored, prod: standard)                  │
│  • JWT Authentication (authenticateUser / optionalAuth)           │
│  • Multer Memory File Buffer & MIME Filter (5MB cap)              │
│  • Zod Schema Validation & Error Transformation                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      CONTROLLER LAYER                             │
│  • Request Parameter Extraction & Response Formatting             │
│  • Handlers wrapped with asyncErrorHandler (Promise isolation)    │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                       SERVICE LAYER                               │
│  • Business Logic, Hot/Top Feed Calculations                      │
│  • Comment Trees, Membership & Role Resolution                    │
│  • Voting Transitions & Author Karma Adjustments                  │
│  • Cloudinary CDN Asset Upload & Deletion Streams                 │
│  • Transactional Email Delivery (Nodemailer)                      │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                 DATA & INFRASTRUCTURE LAYER                       │
│  • MongoDB & Mongoose 9 Models (Compound, Sparse & TTL Indexes)   │
│  • Cloudinary Asset Storage                                       │
│  • SMTP Mail Server                                               │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features

### 1. Authentication & Security

- **Local Authentication**: User registration and login secured with bcrypt (12 salt rounds) and signed JSON Web Tokens.
- **Email Verification**: New signups receive a hashed verification token; accounts are created as _pending users_ until the emailed link is confirmed, with a resend endpoint for expired tokens.
- **Google OAuth 2.0 Integration**:
  - Web OAuth flow via `passport-google-oauth20` with frontend callback redirection.
  - Direct ID token verification (`POST /api/auth/google/token`) for mobile/SPA clients using `google-auth-library`.
- **Account Conflict Protection**: Prevents account takeover by disallowing OAuth creation if the email already exists with a local password account.
- **Password Reset Flow**: Cryptographically secure SHA-256 hashed reset tokens stored in MongoDB with a 10-minute TTL index, accompanied by automated HTML transactional emails.
- **HTTP Hardening**: `helmet` sets security headers (HSTS, X-Frame-Options, no-sniff, etc.); CORS is restricted to the frontend origins listed in `FRONTEND_URL` (comma-separated for staging + production), while origin-less requests (curl, mobile apps, health checks) remain allowed.
- **Rate Limiting**: Global limiter of 300 requests / 15 min per IP across `/api`, with a stricter 20 requests / 15 min bucket on `/api/auth` to blunt brute-force attacks on login and OAuth token flows. `trust proxy` is enabled so real client IPs are resolved behind Render/Nginx.
- **Injection & Pollution Protection**: Custom sanitizer middleware strips MongoDB operator keys (`$gt`, `$ne`, ...) from body, params, and query (works on Express 5, unlike `express-mongo-sanitize`); `hpp` collapses duplicate query parameters; JSON and urlencoded bodies are capped at 10 kb.

### 2. Multi-Type Post Management

- **Text Posts**: Markdown body content (up to 40,000 characters) with customizable titles.
- **Link Posts**: External URL validation using Zod with optional summary captions.
- **Image Posts**: Direct image file upload (JPEG, PNG, WEBP, GIF, max 5MB) streamed to Cloudinary CDN, storing `url` and `publicId` for remote lifecycle management.
- **Community Linkage**: Posts optionally belong to a community, tracked with live `commentCount` statistics.
- **Pinning & Comment Locking**: Post authors can pin posts and lock/unlock comment threads at any time.
- **Soft Deletion**: Posts are soft-deleted (`isDeleted: true`), automatically excluding them from public feeds while preserving comment thread trees and cleaning up remote Cloudinary assets.

### 3. Reddit-Style Feed & Ranking Engine

- **Hot Feed**: Dynamic time-decay algorithm prioritizing active and recent discussions.
- **Top Feed**: Filterable by time windows (`hour`, `day`, `week`, `month`, `year`, `all`) and sorted by absolute net score (`upvotes - downvotes`).
- **New Feed**: Chronological descending index.
- **Context-Aware Feed Hydration**: Optional JWT authentication checks if the requester has upvoted, downvoted, or saved each post in the returned feed.

### 4. Voting, Karma & Bookmarking

- **Bidirectional Voting**: Supports `upvote`, `downvote`, and vote removal (`remove`) on both posts and comments.
- **Score Calculation**: Automatically keeps `score = upvotes - downvotes`.
- **Dynamic Author Karma**: Author's karma increments/decrements in real-time based on community votes.
- **Post Bookmarking**: Toggle save/unsave posts into user's private library (`/api/users/me/saved`).

### 5. Nested Comment Trees

- **Unlimited Nesting**: Replies attach to any comment via a materialized-path `ancestors` array plus a `depth` counter — no recursive queries needed.
- **Efficient Tree Loading**: A single query on `{ ancestors }` fetches an entire reply subtree; responses are returned as an already-sorted comment tree.
- **Comment Voting**: Independent upvote/downvote system with score tracking, mirroring post voting.
- **Pinning**: Post authors can pin the best comment to the top of a thread.
- **Edit Tracking & Soft Deletion**: Comments flag `isEdited`, and deletions tombstone the comment while cascading cleanly across the subtree.

### 6. Communities & Moderation

- **Community Creation**: Scoped spaces with unique name and slug, avatar/banner URLs, description, and denormalized `memberCount` / `postCount` stats.
- **Membership**: Users join and leave communities freely; membership records track role and join date.
- **Four-Tier Role System**: `owner → admin → moderator → member`, with owner-protected role appointment and demotion endpoints.
- **Banning**: Admins/moderators can ban and unban disruptive users, blocking banned users from joining or posting.
- **Content Removal**: Moderators can remove any post from their community while preserving author accountability.

### 7. Unified Search

- **Single Endpoint**: `GET /api/search?q=<query>&type=user|community|all` — validated and trimmed (1–100 chars).
- **Server-Side Matching**: Case-insensitive regex search across usernames, display names, community names, and slugs via aggregation pipelines.

---

## 🗄 Database Schema & Indexing

```
 ┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
 │                User                  │          │                 Post                 │
 ├──────────────────────────────────────┤          ├──────────────────────────────────────┤
 │ _id: ObjectId                        │1        *│ _id: ObjectId                        │
 │ username: string (unique)            ├──────────► author: ObjectId (ref: User)         │
 │ email: string (unique)               │          │ community?: ObjectId (ref: Community)│
 │ displayName: string                  │          │ title: string (3-300 chars)          │
 │ password: string (bcrypt)            │          │ content?: string (markdown)          │
 │ emailVerifiedAt?: Date               │          │ type: "text" | "link" | "image"      │
 │ avatarUrl?: string                   │          │ linkUrl?: string                     │
 │ bio?: string                         │          │ image?: { url, publicId }            │
 │ role: "user" | "admin" | "moderator" │          │ score: number (indexed)              │
 │ isBanned: boolean                    │          │ upvotes / downvotes: number          │
 │ karma: number (default: 0)           │          │ upvotedBy / downvotedBy: ObjectId[]  │
 │ authProvider: "local" | "google"     │          │ commentCount: number                 │
 │ googleId?: string (sparse unique)    │          │ isPinned / isLocked: boolean         │
 │ posts / comments: ObjectId[]         │          │ isDeleted: boolean (indexed)         │
 │ savedPosts: ObjectId[]               │          │ createdAt: Date (indexed)            │
 │ upvotedPosts / downVotedPosts        │          └──────────────────────────────────────┘
 │ upvotedComments / downVotedComments  │
 └──────────────────────────────────────┘

 ┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
 │               Comment                │          │              Community               │
 ├──────────────────────────────────────┤          ├──────────────────────────────────────┤
 │ _id: ObjectId                        │          │ _id: ObjectId                        │
 │ post: ObjectId (ref: Post)           │          │ name: string (unique)                │
 │ author: ObjectId (ref: User)         │          │ slug: string (unique, indexed)       │
 │ parent: ObjectId | null              │          │ description?: string                 │
 │ ancestors: ObjectId[] (indexed)      │          │ avatarUrl? / bannerUrl?: string      │
 │ depth: number                        │          │ owner: ObjectId (ref: User)          │
 │ content: string                      │          │ members: [{ user, role, joinedAt }]  │
 │ upvotes / downvotes / score: number  │          │ bannedUsers: ObjectId[]              │
 │ upvotedBy / downvotedBy: ObjectId[]  │          │ memberCount / postCount: number      │
 │ replyCount: number                   │          │ isDeleted: boolean                   │
 │ isPinned / isEdited / isDeleted      │          │ createdAt / updatedAt: Date          │
 │ createdAt / updatedAt: Date          │          └──────────────────────────────────────┘
 └──────────────────────────────────────┘
```

### Key Compound Indexes

- **Post**: `{ score: -1, createdAt: -1 }` — High-performance Top and Hot feed queries.
- **Post**: `{ author: 1, createdAt: -1 }` — Fast user profile timeline retrieval.
- **Post**: `{ createdAt: -1 }` — Instant New feed pagination.
- **Post**: `{ isDeleted: 1 }` — Filters out soft-deleted posts at the database level.
- **Comment**: `{ ancestors: 1 }` — Single-query subtree loading and cascade operations.
- **Community**: `{ slug: 1 }` (unique) — Fast slug-based community lookups.
- **ResetToken / PendingUser**: `{ expiresAt: 1 } (expireAfterSeconds: 0)` — MongoDB auto-removes expired tokens without background cron jobs.

---

## 📡 API Reference

### Auth & Account Routes

| Method  | Endpoint                               | Access  | Description                                         |
| :------ | :------------------------------------- | :------ | :-------------------------------------------------- |
| `POST`  | `/api/users/signup`                    | Public  | Register new user (creates pending user + email)    |
| `PATCH` | `/api/users/verify-email/:token`       | Public  | Activate account via emailed verification token     |
| `POST`  | `/api/users/resend-verification-email` | Public  | Re-send verification email for a pending account    |
| `POST`  | `/api/users/login`                     | Public  | Authenticate user & return JWT token                |
| `POST`  | `/api/users/forget-password`           | Public  | Send SHA-256 hashed password reset link via email   |
| `PATCH` | `/api/users/reset-password/:token`     | Public  | Reset password using valid reset token              |
| `PATCH` | `/api/users/change-password`           | Private | Change account password (requires current password) |
| `GET`   | `/api/auth/google`                     | Public  | Initiate Google OAuth 2.0 redirect flow             |
| `GET`   | `/api/auth/google/callback`            | Public  | Google OAuth callback URL (issues JWT & redirects)  |
| `GET`   | `/api/auth/google/failure`             | Public  | OAuth failure redirect handler                      |
| `POST`  | `/api/auth/google/token`               | Public  | Verify Google ID token from mobile/SPA client       |

### Post & Feed Routes

| Method   | Endpoint              | Access  | Description                                                                      |
| :------- | :-------------------- | :------ | :------------------------------------------------------------------------------- |
| `POST`   | `/api/posts`          | Private | Create new post (Text, Link, or Image multipart upload)                          |
| `GET`    | `/api/posts`          | Public* | Get post feed (`sort=hot\|new\|top`, `time=hour\|day\|week...`, `page`, `limit`) |
| `GET`    | `/api/posts/:id`      | Public* | Get post details by ID                                                           |
| `PATCH`  | `/api/posts/:id`      | Private | Update post title/content (Author only)                                          |
| `DELETE` | `/api/posts/:id`      | Private | Soft delete post (Author or Admin/Moderator)                                     |
| `POST`   | `/api/posts/:id/vote` | Private | Vote on post (`upvote`, `downvote`, or `remove`)                                 |
| `POST`   | `/api/posts/:id/save` | Private | Toggle bookmark/save post for current user                                       |
| `PATCH`  | `/api/posts/:id/lock` | Private | Lock/unlock comments on a post (Author only)                                     |

_\* Accepts optional JWT to populate `userVote` and `isSaved` fields for the authenticated user._

### Comment Routes

| Method   | Endpoint                      | Access  | Description                                            |
| :------- | :---------------------------- | :------ | :----------------------------------------------------- |
| `POST`   | `/api/posts/:postId/comments` | Private | Create a top-level comment on a post                   |
| `GET`    | `/api/posts/:postId/comments` | Public* | List the full sorted comment tree for a post           |
| `POST`   | `/api/comments/:id/replies`   | Private | Reply to an existing comment (unlimited nesting)       |
| `POST`   | `/api/comments/:id/vote`      | Private | Vote on a comment (`upvote`, `downvote`, or `remove`)  |
| `PATCH`  | `/api/comments/:id/pin`       | Private | Toggle pin on a comment (Post author only)             |
| `PATCH`  | `/api/comments/:id`           | Private | Update comment content (Author only, flags `isEdited`) |
| `DELETE` | `/api/comments/:id`           | Private | Soft delete comment (Author or Admin/Moderator)        |

_\* Comment create/list routes are also mirrored under the `/api/comments` router prefix._

### Community Routes

| Method   | Endpoint                             | Access  | Description                                        |
| :------- | :----------------------------------- | :------ | :------------------------------------------------- |
| `POST`   | `/api/communities`                   | Private | Create a new community (becomes owner)             |
| `GET`    | `/api/communities/:id`               | Public  | Get community details by ID                        |
| `PATCH`  | `/api/communities/:id`               | Private | Update community info (Owner/Admin only)           |
| `DELETE` | `/api/communities/:id`               | Private | Soft delete community                              |
| `POST`   | `/api/communities/:id/join`          | Private | Join the community                                 |
| `POST`   | `/api/communities/:id/leave`         | Private | Leave the community                                |
| `GET`    | `/api/communities/:id/members`       | Public  | List community members with their roles            |
| `GET`    | `/api/communities/:id/posts`         | Public* | List posts within the community                    |
| `POST`   | `/api/communities/:id/roles`         | Private | Appoint a member role (Owner/Admin only)           |
| `DELETE` | `/api/communities/:id/roles`         | Private | Demote a member role (Owner/Admin only)            |
| `POST`   | `/api/communities/:id/ban`           | Private | Ban a user from the community (Admin/Moderator)    |
| `POST`   | `/api/communities/:id/unban`         | Private | Unban a previously banned user                     |
| `DELETE` | `/api/communities/:id/posts/:postId` | Private | Remove a post from the community (Admin/Moderator) |

### Search Routes

| Method | Endpoint                                          | Access | Description                                          |
| :----- | :------------------------------------------------ | :----- | :--------------------------------------------------- |
| `GET`  | `/api/search?q=<query>&type=user\|community\|all` | Public | Search users and/or communities (query: 1–100 chars) |

### User Profile & Engagement Routes

| Method  | Endpoint                     | Access  | Description                                    |
| :------ | :--------------------------- | :------ | :--------------------------------------------- |
| `GET`   | `/api/users/me/profile`      | Private | Get the authenticated user's own profile       |
| `PATCH` | `/api/users/me/profile`      | Private | Update own profile (displayName, bio, avatar)  |
| `GET`   | `/api/users/:username`       | Public* | Get a public user profile by username          |
| `GET`   | `/api/users/:username/posts` | Public* | Get all posts created by a specific user       |
| `GET`   | `/api/users/me/saved`        | Private | Get all saved posts for authenticated user     |
| `GET`   | `/api/users/me/upvoted`      | Private | Get all upvoted posts for authenticated user   |
| `GET`   | `/api/users/me/downvoted`    | Private | Get all downvoted posts for authenticated user |

_\* Accepts optional JWT to enrich the response for the authenticated user._

---

## 💡 Design Decisions & Best Practices

1. **Why Express 5 over Express 4?**
   Express 5 natively catches rejected promises in route handlers and middleware without requiring third-party monkey-patching packages, simplifying async controller flows.
2. **Why Zod for Schema Validation?**
   Zod delivers zero-drift validation: TypeScript types are inferred directly from schemas (`z.infer<typeof schema>`), eliminating discrepancies between validation rules and compile-time interfaces.
3. **Why a Materialized-Path Pattern for Comments?**
   Instead of recursively querying parent-child pairs (the N+1 problem) or using slow `$graphLookup` chains, each comment stores its `ancestors` chain. Loading a full reply tree, checking ancestry permissions, or cascading deletions becomes a single indexed query on `{ ancestors }`.
4. **Why Multer Memory Storage for Cloudinary?**
   Instead of writing uploaded files to temporary server disk space (which causes I/O latency and disk buildup on containerized environments like Docker or AWS ECS), files are buffered in RAM and streamed directly to Cloudinary.
5. **Lean Queries with Selective Field Population**:
   All read queries utilize `.lean()` and select only essential fields (e.g. `username`, `displayName`, `avatarUrl`), reducing MongoDB memory footprint and JSON serialization overhead.
6. **Why a Custom Sanitizer instead of `express-mongo-sanitize`?**
   `express-mongo-sanitize` mutates `req.query`, which is a read-only getter in Express 5 and throws at runtime. The custom middleware rebuilds clean body/params/query objects instead, removing MongoDB operator keys (`$gt`, `$ne`, ...) without fighting the framework.
7. **Layered Rate Limiting instead of a Single Bucket**:
   A generous global limit (300 req / 15 min) keeps normal browsing frictionless, while a tight per-IP bucket on `/api/auth` (20 req / 15 min) makes credential stuffing and OAuth token brute-forcing impractical without penalizing legitimate traffic elsewhere.

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- MongoDB instance (local or Atlas)
- Cloudinary account (image storage)
- SMTP credentials (transactional email)
- Google OAuth 2.0 credentials (optional, for social login)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/hasibulhasanjoy/talkwide.git
cd talkwide

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env   # then fill in the values

# 4. Run in development mode
npm run dev

# 5. Build for production
npm run build
npm start
```

### Environment Variables

| Variable                                                                 | Description                                                                                                                    |
| :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                   | Server port                                                                                                                    |
| `MONGO_URI`                                                              | MongoDB connection string                                                                                                      |
| `JWT_SECRET_KEY`                                                         | JWT signing secret                                                                                                             |
| `JWT_EXPIRES_IN`                                                         | Token expiry (default: `7d`)                                                                                                   |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USERNAME` / `EMAIL_PASSWORD`        | SMTP server for transactional emails                                                                                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`      | Google OAuth 2.0 credentials                                                                                                   |
| `FRONTEND_URL`                                                           | Frontend base URL for OAuth redirects and the CORS allowlist (comma-separated for multiple origins, e.g. staging + production) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary CDN credentials                                                                                                     |

### Available Scripts

| Script           | Description                          |
| :--------------- | :----------------------------------- |
| `npm run dev`    | Start development server (nodemon)   |
| `npm run build`  | Clean & compile TypeScript to `dist` |
| `npm start`      | Run the compiled production build    |
| `npm run lint`   | Lint source files with ESLint        |
| `npm run format` | Format codebase with Prettier        |

---

## 👤 Author

**Hasibul Hasan**

- GitHub: [@hasibulhasanjoy](https://github.com/hasibulhasanjoy)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
