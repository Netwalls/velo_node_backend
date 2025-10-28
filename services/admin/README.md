# Admin microservice (minimal)

This small service exposes admin-only endpoints protected by an API key header `x-admin-key`.

Quick start (dev):

1. Copy `.env.example` to `.env` and set values (DB connection and `ADMIN_API_KEY`).
   Prefer using a single `DATABASE_URL` so all services share the same connection string. Example (used by the auth service in this repo):

DATABASE_URL=postgres://postgres:postgres@localhost:5432/velo_dev 2. From the repo root run:

```bash
cd services/admin
npm install
npm run dev
```

Delete a user (example):

```bash
curl -X DELETE http://localhost:5401/admin/users/<USER_ID> \
  -H "x-admin-key: your_admin_api_key"
```

Notes:

- Secure the service behind a network/ACL or use mTLS.
- Use a service account with least privileges or call a protected monolith API instead of direct DB access.
- Add rate-limiting, logging, and audit trails.

# Admin Service

Placeholder for admin endpoints and KYC workflows.
