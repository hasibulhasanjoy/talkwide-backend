# Talkwide API Reference

> Companion to [`openapi.yaml`](./openapi.yaml) — that file is the
> machine-readable source of truth (importable into Postman/Insomnia, or
> rendered as a browsable site with [`docs.html`](./docs.html)/Redoc). This
> document is the human-readable walkthrough: every endpoint, its inputs,
> and exactly what comes back.

**Base URL:** `https://talkwide-api.onrender.com` (Render free tier — the
first request after inactivity can take 30–60s to wake the instance)
**Local:** `http://localhost:5500`

---

## Table of contents

- [Conventions](#conventions)
- [Auth](#auth)
- [OAuth (Google)](#oauth-google)
- [Users](#users)
- [Posts](#posts)
- [Comments](#comments)
- [Communities](#communities)
- [Search](#search)
- [Error reference](#error-reference)

---

## Conventions

### Response envelope

Every **success** response is shaped:

```json
{ "status": "success", "data": {} }
```

A handful of auth endpoints add a top-level `token` and/or `message`
alongside `status`.

Every **error** response is shaped:

```json
{ "status": "fail", "message": "Human readable message" }
```

`status` is `"fail"` for validation/permission/not-found errors (4xx) and
`"internal server error"` for unhandled server errors (5xx). In
non-production environments, error responses also include `error` and
`stack` for debugging.

### Pagination

Any endpoint that returns a list accepts `page` (default `1`) and `limit`
(default `20`, max `100`) query params, and returns:

```json
{
  "status": "success",
  "data": {
    "posts": [ "...": "..." ],
    "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
  }
}
```

(The array key changes per endpoint — `posts`, `comments`, `members`.)

### Authentication

Two markers are used below:

| Marker          | Meaning                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| 🔒 **Private**  | Requires `Authorization: Bearer <jwt>` — 401 without a valid token                                        |
| 🌐 **Public\*** | No token required; if one is sent, the response is enriched (`userVote`, `isSaved`, `isOwnProfile`, etc.) |
| 🌐 **Public**   | No token involved at all                                                                                  |

Get a token from `POST /api/users/login`, `PATCH /api/users/verify-email/:token`, or the Google OAuth flows — then send it on every private request:

```bash
curl https://talkwide-api.onrender.com/api/users/me/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### IDs

Any `:id`, `:postId`, `:username`-style path segment referring to a
Mongo document is a 24-character hex ObjectId (except `:username`, which
is the username string, and `:token`, which is a raw emailed token).

---

## Auth

### `POST /api/users/signup` — 🌐 Public

Stages the signup and emails a verification link. **No account is created
yet** — only a `PendingUser` record, keyed by a hashed token with a 24h
TTL. Signing up again with the same email replaces the pending attempt.

**Body**

| Field             | Type   | Rules                                                        |
| ----------------- | ------ | ------------------------------------------------------------ |
| `username`        | string | min 3 chars                                                  |
| `displayName`     | string | required                                                     |
| `email`           | string | valid email                                                  |
| `password`        | string | ≥8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| `confirmPassword` | string | must match `password`                                        |

```bash
curl -X POST https://talkwide-api.onrender.com/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hasib_dev",
    "displayName": "Hasibul Hasan",
    "email": "hasib@example.com",
    "password": "Str0ng!Pass",
    "confirmPassword": "Str0ng!Pass"
  }'
```

**202 Response**

```json
{
  "status": "success",
  "message": "Verification email sent. Please verify your email to complete registration.",
  "data": {
    "user": {
      "username": "hasib_dev",
      "displayName": "Hasibul Hasan",
      "email": "hasib@example.com"
    }
  }
}
```

Errors: `400` if a `User` already exists with that email/username.

---

### `PATCH /api/users/verify-email/:token` — 🌐 Public

Confirms the emailed link, promotes the pending signup into a real
`User`, and returns a ready-to-use JWT.

**201 Response**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Email verified successfully. Welcome to Talkwide!",
  "data": {
    "user": {
      "username": "hasib_dev",
      "displayName": "Hasibul Hasan",
      "email": "hasib@example.com",
      "emailVerifiedAt": "2026-09-26T10:00:00.000Z"
    }
  }
}
```

Errors: `400` invalid/expired token; `409` if the username/email was
taken by someone else while this signup sat unverified.

---

### `POST /api/users/resend-verification-email` — 🌐 Public

Body: `{ "email": "hasib@example.com" }` → issues a fresh token/TTL for an
existing pending signup. `404` if no pending signup exists for that email.

---

### `POST /api/users/login` — 🌐 Public

Body: `password` plus **either** `username` **or** `email`.

```bash
curl -X POST https://talkwide-api.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "hasib@example.com", "password": "Str0ng!Pass" }'
```

**200 Response**

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": { "username": "hasib_dev", "displayName": "Hasibul Hasan", "email": "hasib@example.com" }
}
```

Errors: `401` on any credential mismatch (deliberately the same message for
"no such user" and "wrong password", to avoid leaking which one failed).

---

### `POST /api/users/forget-password` — 🌐 Public

Body: `{ "email": "..." }`. Generates a reset token, SHA-256-hashes it
before storing, sets a **10-minute** TTL, and emails the raw token as a
link. `404` if no user has that email.

### `PATCH /api/users/reset-password/:token` — 🌐 Public

Body: `{ "password", "confirmPassword" }`. Returns a fresh JWT on success.
`400` if the token is invalid/expired.

### `PATCH /api/users/change-password` — 🔒 Private

Body: `{ "oldPassword", "newPassword", "confirmPassword" }`.
`401` if `oldPassword` is wrong; validation rejects reusing the same
password.

---

## OAuth (Google)

Two independent flows — pick whichever fits your client:

| Flow                          | Use case                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| `GET /api/auth/google`        | Server-rendered apps — full browser redirect                             |
| `POST /api/auth/google/token` | SPA / mobile — client SDK gets an ID token, backend verifies it directly |

### `GET /api/auth/google` — 🌐 Public

Redirects to Google's consent screen (`scope: profile, email`).

### `GET /api/auth/google/callback` — 🌐 Public

Google redirects back here. On success, **redirects** (not JSON) to:

```
{FRONTEND_URL}/auth/google/callback?token=...&username=...&displayName=...&email=...
```

On failure, redirects to `{FRONTEND_URL}/login?error=authentication_failed`.

### `POST /api/auth/google/token` — 🌐 Public

Body: `{ "idToken": "<google-id-token-from-client-sdk>" }`. Creates the
user on first sign-in (or links `googleId` to a matching-email account
that is also `authProvider: google`). Returns `409` if the email already
belongs to a `local` password account.

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "username": "hasib_dev",
    "displayName": "Hasibul Hasan",
    "email": "hasib@example.com",
    "avatarUrl": null
  }
}
```

---

## Users

### `GET /api/users/me/profile` — 🔒 Private

Full private profile (includes `email`, `emailVerifiedAt`, `lastLogin`).

### `PATCH /api/users/me/profile` — 🔒 Private

Body (all optional, at least one required): `username`, `displayName`,
`bio` (≤500 chars), `avatarUrl`. `409` if the requested `username` is
already taken.

### `GET /api/users/me/saved` · `/me/upvoted` · `/me/downvoted` — 🔒 Private

Paginated post lists from the user's `savedPosts` / `upvotedPosts` /
`downVotedPosts` arrays. Query: `page`, `limit`.

### `GET /api/users/:username` — 🌐 Public\*

Public profile (no `email`). Adds `isOwnProfile: boolean` when
authenticated.

### `GET /api/users/:username/posts` — 🌐 Public\*

That user's non-deleted posts, paginated, newest first.

---

## Posts

### `POST /api/posts` — 🔒 Private

Creates a `text`, `link`, or `image` post.

| Field       | Required for  | Notes                                            |
| ----------- | ------------- | ------------------------------------------------ |
| `title`     | always        | 3–300 chars                                      |
| `type`      | always        | `text` \| `link` \| `image`                      |
| `content`   | `text`        | up to 40,000 chars                               |
| `linkUrl`   | `link`        | valid URL                                        |
| `image`     | `type: image` | multipart file field, JPEG/PNG/WEBP/GIF, max 5MB |
| `community` | optional      | ObjectId — posting requires prior membership     |

For `type: image`, send `multipart/form-data` with the file under the
`image` field:

```bash
curl -X POST https://talkwide-api.onrender.com/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Sunset over the river" \
  -F "type=image" \
  -F "image=@sunset.jpg"
```

Otherwise plain JSON works for `text`/`link` posts. Uploaded images are
streamed straight to Cloudinary (no local disk write).

Errors: `403` if posting to a community you're not a member of, or one
you're banned from; `404` if the community doesn't exist; `400` if an
image file is missing for a `type: image` post.

### `GET /api/posts` — 🌐 Public\*

The main feed.

| Query           | Values                                                                               | Default   |
| --------------- | ------------------------------------------------------------------------------------ | --------- |
| `sort`          | `hot` \| `new` \| `top`                                                              | `hot`     |
| `time`          | `hour` \| `day` \| `week` \| `month` \| `year` \| `all` (only applies to `sort=top`) | `day`     |
| `community`     | community ObjectId, to scope the feed                                                | —         |
| `page`, `limit` | pagination                                                                           | `1`, `20` |

`hot` ranks by `score + ageInSeconds / 45000` (time-decay); `top` ranks by
raw `score` within the chosen `time` window; `new` is pure `createdAt`
descending.

### `GET /api/posts/:id` — 🌐 Public\*

Single post. Adds `userVote` (`"upvote" | "downvote" | null`) and
`isSaved` when authenticated.

### `PATCH /api/posts/:id` — 🔒 Private (author only)

Body: `title` and/or `content`. `403` if you're not the author.

### `DELETE /api/posts/:id` — 🔒 Private

Soft-deletes (`isDeleted: true` — the post is excluded from feeds but the
comment tree is preserved). Allowed for: the author, a site `admin`/`moderator`, or an `owner`/`admin`/`moderator` of the post's community.
Also cleans up the Cloudinary asset for image posts.

### `POST /api/posts/:id/vote` — 🔒 Private

Body: `{ "voteType": "upvote" | "downvote" | "remove" }`.

- Re-sending the same vote is a no-op.
- Switching `upvote` ↔ `downvote` atomically updates both counters.
- You cannot vote on your own post (`403`).
- The post author's `karma` is adjusted by ±1 (±2 on a full switch).

```json
{
  "status": "success",
  "data": { "score": 13, "upvotes": 14, "downvotes": 1, "userVote": "upvote" }
}
```

### `POST /api/posts/:id/save` — 🔒 Private

Toggles bookmarking. Response: `{ "data": { "isSaved": true } }`.

### `PATCH /api/posts/:id/lock` — 🔒 Private (author only)

Toggles `isLocked` — while locked, new comments/replies on the post are
rejected with `403`.

---

## Comments

Comments use a **materialized path**: every comment stores its full
`ancestors` chain plus a `depth`, so an entire reply subtree loads (or
cascade-deletes) in a single indexed query — no recursive lookups.

### `POST /api/posts/:postId/comments` — 🔒 Private

Top-level comment. Body: `{ "content": "..." }` (1–10,000 chars).
`403` if the post has comments locked. Also exists mirrored as
`POST /api/comments/:postId/comments`.

### `GET /api/posts/:postId/comments` — 🌐 Public\*

Returns the **nested, paginated tree** for the post's top-level comments
(descendants of the current page load in the same call).

| Query           | Values             | Default   |
| --------------- | ------------------ | --------- |
| `sort`          | `popular` \| `new` | `popular` |
| `page`, `limit` | pagination         | `1`, `20` |

Pinned comments always sort first. Replies within each thread are
ordered by score, then oldest-first.

```json
{
  "status": "success",
  "data": {
    "comments": [
      {
        "_id": "66f1...",
        "content": "Great post!",
        "score": 5,
        "depth": 0,
        "isPinned": true,
        "replies": [
          { "_id": "66f2...", "content": "Agreed!", "score": 2, "depth": 1, "replies": [] }
        ]
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

### `POST /api/comments/:id/replies` — 🔒 Private

Reply to any comment (unlimited nesting). Body: `{ "content": "..." }`.

### `POST /api/comments/:id/vote` — 🔒 Private

Same semantics as post voting: `{ "voteType": "upvote" | "downvote" | "remove" }`. `403` on voting your own comment.

### `PATCH /api/comments/:id/pin` — 🔒 Private (post author only)

Toggles `isPinned` on a comment under that author's post.

### `PATCH /api/comments/:id` — 🔒 Private (comment author only)

Body: `{ "content": "..." }`. Sets `isEdited: true`.

### `DELETE /api/comments/:id` — 🔒 Private

Soft-deletes the comment **and its entire reply subtree** in one
operation. Allowed for the author or a site `admin`/`moderator`.

```json
{ "status": "success", "message": "Comment deleted successfully", "data": { "deletedCount": 4 } }
```

---

## Communities

Four-tier roles: `owner → admin → moderator → member`.

### `POST /api/communities` — 🔒 Private

Body: `name` (3–50 chars, letters/numbers/underscores; becomes the slug),
`description` (optional, ≤500 chars). Creator becomes `owner`.
`409` if the (lowercased) name/slug is taken.

### `GET /api/communities/:id` — 🌐 Public

Full detail with populated `owner` and `members.user`.

### `PATCH /api/communities/:id` — 🔒 Private (`owner`/`admin`)

Body: `name` and/or `description`.

### `DELETE /api/communities/:id` — 🔒 Private (`owner` only)

Soft-deletes the community **and cascades** to soft-delete all of its
posts.

### `POST /api/communities/:id/join` — 🔒 Private

`400` if already a member, or banned. Response: `{ "data": { "memberCount": 42 } }`.

### `POST /api/communities/:id/leave` — 🔒 Private

The owner cannot leave without transferring ownership first (`400`).

### `GET /api/communities/:id/members` — 🌐 Public

Query: `role` filter (`member`|`moderator`|`admin`|`owner`), `page`, `limit`.

### `GET /api/communities/:id/posts` — 🌐 Public\*

Query: `sort` (`new`|`top`|`hot`, default `new`), `page`, `limit`.

### `POST /api/communities/:id/roles` — 🔒 Private

Body: `{ "userId", "role": "moderator" | "admin" }`. Only the `owner` can
appoint `admin`s; `admin`s (and the owner) can appoint `moderator`s.

### `DELETE /api/communities/:id/roles` — 🔒 Private

Body: `{ "userId" }` — demotes back to `member`. Same permission rules
as appointing, in reverse.

### `POST /api/communities/:id/ban` / `/unban` — 🔒 Private

Body: `{ "userId" }`. `admin`/`moderator`/`owner` can ban, but only the
`owner` can ban an `admin`, and only `admin`+`owner` can ban a
`moderator`. Banning removes existing membership.

### `DELETE /api/communities/:id/posts/:postId` — 🔒 Private

Moderator-only post removal within the community (distinct from the
author/site-mod path on `DELETE /api/posts/:id`).

---

## Search

### `GET /api/search` — 🌐 Public

Query: `q` (1–100 chars, required), `type` (`user`|`community`|`all`,
default `all`).

Matches case-insensitively against `username`/`displayName` (users) or
`slug`/`name` (communities), and ranks results: **exact match** (100/80
pts) > **prefix match** (50/40) > **substring match** (20/10), with
karma / memberCount as a tie-breaker. Each type is capped at 20 results.

```bash
curl "https://talkwide-api.onrender.com/api/search?q=hasib&type=all"
```

```json
{
  "status": "success",
  "count": 1,
  "results": [
    {
      "username": "hasib_dev",
      "displayName": "Hasibul Hasan",
      "karma": 42,
      "searchType": "user",
      "matchScore": 100
    }
  ]
}
```

---

## Error reference

| Status | Meaning                                                             |
| ------ | ------------------------------------------------------------------- |
| `400`  | Validation failed (Zod), or a business-rule precondition wasn't met |
| `401`  | Missing/invalid/expired JWT, or wrong login credentials             |
| `403`  | Authenticated, but not permitted (wrong role/ownership)             |
| `404`  | Resource doesn't exist, or is soft-deleted                          |
| `409`  | Conflicting resource (duplicate username/email/slug)                |
| `500`  | Unhandled error — message is generic in production                  |

Every error body: `{ "status": "fail" | "internal server error", "message": string }`.
