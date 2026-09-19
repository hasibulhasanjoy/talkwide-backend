# 🚀 Talkwide Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express%205-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose 9](https://img.shields.io/badge/Mongoose%209-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Passport.js](https://img.shields.io/badge/Passport.js-34E0A1?style=for-the-badge&logo=passport&logoColor=black)](https://www.passportjs.org/)

> A scalable, production-grade social discussion platform backend inspired by Reddit. Built with modern TypeScript (ESM), Express 5, Mongoose 9, and Zod runtime schema validation.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Engineering Highlights](#-key-engineering-highlights)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
  - [1. Authentication & Security](#1-authentication--security)
  - [2. Multi-Type Post Management](#2-multi-type-post-management)
  - [3. Reddit-Style Feed & Ranking Engine](#3-reddit-style-feed--ranking-engine)
  - [4. Voting, Karma & Bookmarking](#4-voting-karma--bookmarking)
- [Database Schema & Indexing](#-database-schema--indexing)
- [API Reference](#-api-reference)
  - [Auth & Account Routes](#auth--account-routes)
  - [Post & Feed Routes](#post--feed-routes)
  - [User Profile & Engagement Routes](#user-profile--engagement-routes)
- [Design Decisions & Best Practices](#-design-decisions--best-practices)

---

## 🌟 Overview

**Talkwide** is a forum and social media backend engineered for high performance, end-to-end type safety, and clean software architecture. It implements Reddit-style community interactions including multi-format content creation (text, links, images via Cloudinary CDN), time-decay Hot feed ranking algorithms, atomic voting with dynamic karma calculation, and dual-strategy authentication (Local JWT + Google OAuth 2.0).

---

## ⚡ Key Engineering Highlights

- **End-to-End Type Safety**: Pure TypeScript (ESM) with static typing inferred directly from Zod runtime validation schemas.
- **Dual Authentication Architecture**: Supports both traditional server-side OAuth redirect flows (Passport.js) and client-side Google ID token verification (`google-auth-library`) for SPAs and mobile applications.
- **Reddit-Like Hot Feed Algorithm**: Dynamic score decay balancing post recency and user engagement:
  $$\text{HotScore} = \text{score} + \frac{\text{postAgeInSeconds}}{45000}$$
- **Zero-Disk Media Stream Pipeline**: Multipart file uploads handled entirely in-memory using Multer and streamed directly to Cloudinary CDN, preventing disk bottlenecks and container accumulation.
- **Atomic Operations & Karma Sync**: Single-transaction vote toggling with automatic karma adjustment on the post author's profile.
- **Automated Data Hygiene**: Auto-expiring password reset tokens backed by MongoDB TTL indexes and SHA-256 cryptographic hashing.
- **Layered Error Handling**: Centralized error interceptor mapping Mongoose CastErrors, duplicate key violations (`11000`), JWT invalidations, and Zod formatting errors into normalized JSON responses.

---

## 🏗 System Architecture

Talkwide adheres to **Layered Clean Architecture** principles, enforcing separation of concerns across middleware, controllers, services, and models.

```
                    Client HTTP / REST Requests
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      MIDDLEWARE PIPELINE                          │
│  • CORS & Morgan Logging                                          │
│  • JWT Authentication (authenticateUser / optionalAuth)           │
│  • Multer Memory File Buffer & MIME Filter                        │
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
│  • Voting Transitions & Author Karma Adjustments                  │
│  • Cloudinary CDN Asset Upload & Deletion Streams                 │
│  • Transactional Email Delivery (Nodemailer)                      │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                 DATA & INFRASTRUCTURE LAYER                       │
│  • MongoDB & Mongoose 9 Models (Compound & TTL Indexes)           │
│  • Cloudinary Asset Storage                                       │
│  • SMTP Mail Server                                               │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features

### 1. Authentication & Security

- **Local Authentication**: User registration and login secured with bcrypt (12 salt rounds) and signed JSON Web Tokens.
- **Google OAuth 2.0 Integration**:
  - Web OAuth flow via `passport-google-oauth20` with frontend callback redirection.
  - Direct ID token verification (`POST /api/auth/google/token`) for mobile/SPA clients using `google-auth-library`.
- **Account Conflict Protection**: Prevents account takeover by disallowing OAuth creation if the email already exists with a local password account.
- **Password Reset Flow**: Cryptographically secure SHA-256 hashed reset tokens stored in MongoDB with a 10-minute TTL index, accompanied by automated HTML transactional emails.

### 2. Multi-Type Post Management

- **Text Posts**: Markdown body content (up to 40,000 characters) with customizable titles.
- **Link Posts**: External URL validation using Zod with optional summary captions.
- **Image Posts**: Direct image file upload (JPEG, PNG, WEBP, GIF, max 5MB) streamed to Cloudinary CDN, storing `url` and `publicId` for remote lifecycle management.
- **Soft Deletion**: Posts are soft-deleted (`isDeleted: true`), automatically excluding them from public feeds while preserving comment thread trees and cleaning up remote Cloudinary assets.

### 3. Reddit-Style Feed & Ranking Engine

- **Hot Feed**: Dynamic time-decay algorithm prioritizing active and recent discussions.
- **Top Feed**: Filterable by time windows (`hour`, `day`, `week`, `month`, `year`, `all`) and sorted by absolute net score (`upvotes - downvotes`).
- **New Feed**: Chronological descending index.
- **Context-Aware Feed Hydration**: Optional JWT authentication checks if the requester has upvoted, downvoted, or saved each post in the returned feed.

### 4. Voting, Karma & Bookmarking

- **Bidirectional Voting**: Supports `upvote`, `downvote`, and vote removal (`remove`).
- **Score Calculation**: Automatically keeps `score = upvotes - downvotes`.
- **Dynamic Author Karma**: Author's karma increments/decrements in real-time based on community votes.
- **Post Bookmarking**: Toggle save/unsave posts into user's private library (`/api/users/me/saved`).

---

## 🗄 Database Schema & Indexing

```
 ┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
 │                User                  │          │                 Post                 │
 ├──────────────────────────────────────┤          ├──────────────────────────────────────┤
 │ _id: ObjectId                        │1        *│ _id: ObjectId                        │
 │ username: string (unique)            ├──────────► author: ObjectId (ref: User)         │
 │ email: string (unique)               │          │ title: string (3-300 chars)          │
 │ password?: string (bcrypt)           │          │ content?: string (markdown)          │
 │ authProvider: "local" | "google"     │          │ type: "text" | "link" | "image"      │
 │ googleId?: string (sparse unique)    │          │ linkUrl?: string                     │
 │ karma: number (default: 0)           │          │ image?: { url, publicId }            │
 │ posts: ObjectId[]                    │          │ score: number (indexed)              │
 │ savedPosts: ObjectId[]               │          │ upvotes: number                      │
 │ upvotedPosts: ObjectId[]             │          │ downvotes: number                    │
 │ downVotedPosts: ObjectId[]           │          │ upvotedBy: ObjectId[]                │
 └──────────────────────────────────────┘          │ downvotedBy: ObjectId[]              │
                                                   │ isDeleted: boolean (indexed)         │
                                                   │ createdAt: Date (indexed)            │
                                                   └──────────────────────────────────────┘
```

### Key Compound Indexes

- **Post**: `{ score: -1, createdAt: -1 }` — High-performance Top and Hot feed queries.
- **Post**: `{ author: 1, createdAt: -1 }` — Fast user profile timeline retrieval.
- **Post**: `{ createdAt: -1 }` — Instant New feed pagination.
- **Post**: `{ isDeleted: 1 }` — Filters out soft-deleted posts at the database level.
- **ResetToken**: `{ expiresAt: 1 } (expireAfterSeconds: 0)` — MongoDB auto-removes expired tokens without background cron jobs.

---

## 📡 API Reference

### Auth & Account Routes

| Method  | Endpoint                           | Access  | Description                                         |
| :------ | :--------------------------------- | :------ | :-------------------------------------------------- |
| `POST`  | `/api/users/signup`                | Public  | Register new user with username, email, password    |
| `POST`  | `/api/users/login`                 | Public  | Authenticate user & return JWT token                |
| `POST`  | `/api/users/forget-password`       | Public  | Send SHA-256 hashed password reset link via email   |
| `PATCH` | `/api/users/reset-password/:token` | Public  | Reset password using valid reset token              |
| `PATCH` | `/api/users/change-password`       | Private | Change account password (requires current password) |
| `GET`   | `/api/auth/google`                 | Public  | Initiate Google OAuth 2.0 redirect flow             |
| `GET`   | `/api/auth/google/callback`        | Public  | Google OAuth callback URL (issues JWT & redirects)  |
| `GET`   | `/api/auth/google/failure`         | Public  | OAuth failure redirect handler                      |
| `POST`  | `/api/auth/google/token`           | Public  | Verify Google ID token from mobile/SPA client       |

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

_\* Accepts optional JWT to populate `userVote` and `isSaved` fields for the authenticated user._

### User Profile & Engagement Routes

| Method | Endpoint                     | Access  | Description                                    |
| :----- | :--------------------------- | :------ | :--------------------------------------------- |
| `GET`  | `/api/users/:username/posts` | Public* | Get all posts created by a specific user       |
| `GET`  | `/api/users/me/saved`        | Private | Get all saved posts for authenticated user     |
| `GET`  | `/api/users/me/upvoted`      | Private | Get all upvoted posts for authenticated user   |
| `GET`  | `/api/users/me/downvoted`    | Private | Get all downvoted posts for authenticated user |

---

## 💡 Design Decisions & Best Practices

1. **Why Express 5 over Express 4?**
   Express 5 natively catches rejected promises in route handlers and middleware without requiring third-party monkey-patching packages, simplifying async controller flows.
2. **Why Zod for Schema Validation?**
   Zod delivers zero-drift validation: TypeScript types are inferred directly from schemas (`z.infer<typeof schema>`), eliminating discrepancies between validation rules and compile-time interfaces.
3. **Why Multer Memory Storage for Cloudinary?**
   Instead of writing uploaded files to temporary server disk space (which causes I/O latency and disk buildup on containerized environments like Docker or AWS ECS), files are buffered in RAM and streamed directly to Cloudinary.
4. **Lean Queries with Selective Field Population**:
   All read queries utilize `.lean()` and select only essential fields (e.g. `username`, `displayName`, `avatarUrl`), reducing MongoDB memory footprint and JSON serialization overhead.

---

## 👤 Author

**Hasibul Hasan**

- GitHub: [@hasibulhasanjoy](https://github.com/hasibulhasanjoy)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
