## QuotaShield

QuotaShield is a minimal API key platform: generate/revoke keys, enforce per-key rate limits, track usage, and manage everything from an authenticated dashboard.

## Features

- **Clerk authentication**: protects the dashboard and user-scoped APIs
- **API key management**: create and revoke keys (raw key shown once)
- **Secure storage**: only a SHA-256 hash of the key is stored (plus prefix/last4 for display)
- **Public API protection**: API-key auth via `Authorization: Bearer ...` or `x-api-key: ...`
- **Rate limiting**: 30 requests/minute per key (Upstash Redis)
- **Usage tracking**: daily + monthly counters in Redis, per keyHash
- **Dashboard**: usage cards + keys table + create/revoke UI
- **Audit logs**: `KEY_CREATED`, `KEY_REVOKED`, `API_CALL`, `RATE_LIMITED` (no raw keys)

## Tech Stack

- **Next.js** (App Router)
- **TypeScript**
- **Clerk** (auth)
- **MongoDB Atlas** + official `mongodb` driver (durable storage)
- **Upstash Redis** + `@upstash/redis` (rate limiting + usage counters)
- **Vercel** (deployment)
- **Zod** (request validation)

## Architecture (High-level)

Request flow:

- **Dashboard UI** calls Next.js API routes (Clerk-protected)
- **Clerk** provides the `userId` for scoping keys and usage
- **MongoDB** stores API key metadata + hashed keys + audit logs
- **Redis** stores per-minute rate limit counters and usage counters

```
Browser (Dashboard) -> Next.js Route Handlers -> (Clerk / MongoDB / Redis)
Public clients (API key) -> Next.js Route Handlers -> (MongoDB / Redis)
```

## API Overview

| Method | Path | Auth | Purpose | Response (brief) |
|---|---|---|---|---|
| GET | `/api/keys` | Clerk session | List your API keys | `{ keys: [{ id, name, prefix, last4, status, createdAt, lastUsedAt, revokedAt }] }` |
| POST | `/api/keys` | Clerk session | Create an API key (raw key shown once) | `{ rawKey, key: { id, name, prefix, last4, status, createdAt, lastUsedAt } }` |
| DELETE | `/api/keys/:id` | Clerk session | Revoke an API key (idempotent) | `{ ok: true }` |
| GET | `/api/usage` | Clerk session | Sum usage across active keys | `{ today: number, month: number }` |
| GET | `/api/public/ping` | API key header | Example protected endpoint + rate limit + usage tracking | `{ ok: true, ts: ISOString }` |
| GET | `/api/debug/db` | none | Internal: MongoDB ping | `{ ok: true }` or `{ ok: false, error }` |
| GET | `/api/debug/mongo` | none | Internal: MongoDB ping + db name | `{ ok: true, db }` or `{ ok: false, error }` |

### Rate limit example (expect 429 after ~30 requests/min)

```bash
for i in {1..35}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer PASTE_RAW_KEY_HERE" \
    http://localhost:3000/api/public/ping)
  echo "$i -> $code"
done
```

Expected: first ~30 return `200`, then `429` with `{ "error": "rate_limited" }`.

### Notes on `curl` for Clerk-protected endpoints

`/api/keys` and `/api/usage` require a **Clerk session** (browser cookies). For local testing, the simplest path is to use the Dashboard UI. (You *can* call them with `curl` by forwarding your Clerk cookies, but it’s intentionally not optimized for a pure-curl workflow.)

## Security Notes (Brief)

- **Raw API keys are shown once** on creation; only a hash is stored.
- **Hashing uses a pepper**: `SHA-256(rawKey + API_KEY_PEPPER)`.
- **Redis stores only key hashes** (never raw API keys).
- **Key ownership is enforced** on all key management routes using Clerk `userId`.
