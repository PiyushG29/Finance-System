# Minimal Supabase Backend Wrapper

This is a thin Node.js + Express layer that proxies authenticated requests to Supabase.

## Why this exists

- Gives the project a conventional backend shape for evaluation
- Keeps Supabase as the data source
- Exposes a single dashboard wrapper endpoint for cleaner demos

## Endpoints

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/resolve-login`
- `GET /api/dashboard`
- `GET /api/records`
- `POST /api/records`
- `PATCH /api/records/:id`
- `DELETE /api/records/:id`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/role`
- `PATCH /api/admin/users/:userId/status`

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in Supabase URL and anon key.
3. Add the Supabase service role key if you want username-based sign-in resolution.
3. Run:

```bash
npm install
npm run dev
```

The server starts on `http://localhost:4000`.

## Request Auth

Send the Supabase access token from the frontend:

```http
Authorization: Bearer <access_token>
```
