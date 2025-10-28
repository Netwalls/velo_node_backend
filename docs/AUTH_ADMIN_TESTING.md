# Testing guide — Auth microservice & Admin endpoints

This document explains how to run and test the Auth microservice (`services/auth`) and the Admin endpoints (quick monolith admin or admin microservice). It covers both Docker (recommended) and local-development flows, example requests (curl), expected responses, DB inspection, and troubleshooting.

## Overview

- Auth microservice location: `services/auth`
- Main entry: `services/auth/src/server.ts` (exposes `/api/auth` endpoints)
- Admin endpoints (quick implementation): mounted under `/admin` (monolith) or `services/admin` (if you scaffolded a separate service).
- DB: Postgres (docker-compose or local). TypeORM is used for entities: `User`, `RefreshToken`, `UserAddress`.

Prerequisites

- macOS (or Linux/Windows with small path adjustments)
- Node.js (>= 16 recommended) and npm
- Docker Desktop (for containerized flow) or a running Postgres DB
- `jq` for pretty JSON output (optional but helpful)

---

## Quick checklist (pick one)

### A — Docker compose (recommended)

1. Start Docker Desktop.
2. From repo root, bring up Postgres and Redis (auth container optional):

```bash
cd /Users/iamtechhunter/Documents/workspace/velo_node_backend
# start DB and redis
docker-compose up -d postgres redis

# build & start auth (optional: runs the auth container)
docker-compose up --build -d auth
```

3. Ensure an auth `.env` exists at `services/auth/.env` and contains correct values. Minimal example for containerized run:

```
PORT=3002
DATABASE_URL=postgres://postgres:postgres@postgres:5432/velo_dev
JWT_SECRET=devsecret
NODE_ENV=development   # enables TypeORM synchronize in dev only
ADMIN_API_KEY=dev_admin_key_here
```

Notes: inside containers use host `postgres` (the service name).

4. Tail logs while you test:

```bash
docker-compose logs -f auth
```

5. Smoke test registration (wait until logs show "Auth service listening on <port>"):

```bash
curl -sS -X POST http://localhost:3002/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke+test@example.com","password":"secret123"}' | jq
```

Expected JSON (successful):

```json
{
  "message": "User registered successfully. Please verify your email.",
  "userId": "<uuid>",
  "addresses": [
    { "chain": "eth", "network": "mainnet", "address": "..." },
    { "chain": "eth", "network": "testnet", "address": "..." },
    { "chain": "btc", "network": "mainnet", "address": "..." },
    ...
  ]
}
```

6. Login (use email+password from above):

```bash
curl -sS -X POST http://localhost:3002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke+test@example.com","password":"secret123"}' | jq
```

Response contains `accessToken` and `refreshToken`.

7. Refresh token:

```bash
curl -sS -X POST http://localhost:3002/api/auth/refresh-token \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<token>"}' | jq
```

8. Verify returned addresses exist in DB (optional):

```bash
# find postgres container name
docker ps --filter ancestor=postgres:15
# then:
docker exec -it <postgres_container_name> psql -U postgres -d velo_dev -c "select id,chain,network,address,userId from user_addresses where userId='<userId>'"
```

---

### B — Local dev (fast iteration)

1. Ensure Postgres is running on your host (Homebrew or other):

```bash
# start if using Homebrew
brew services start postgresql
createdb velo_dev || true
```

2. Create the local `.env` for auth (example):

```bash
cp services/auth/.env.example services/auth/.env
cat > services/auth/.env <<'EOF'
PORT=3002
DATABASE_URL=postgres://postgres:postgres@localhost:5432/velo_dev
JWT_SECRET=devsecret
NODE_ENV=development
ADMIN_API_KEY=dev_admin_key_here
EOF
```

3. Run auth locally:

```bash
cd services/auth
npm install --no-audit --no-fund
npm run dev
```

4. Run the same curl tests as above (register, login). Watch the terminal for logs (you will see wallet creation logs).

---

## Admin endpoints — how to test

This section assumes a simple admin implementation that checks an `ADMIN_API_KEY` header (`x-admin-key`) or `ADMIN_API_KEY` env var. If you implemented role-based admin (user.isAdmin) instead, pass a valid JWT with a user that has admin role.

Example admin routes (assumed):

- GET /admin/users — list users
- GET /admin/users/:id — get user
- POST /admin/users — create user (admin)
- PUT /admin/users/:id — update user
- DELETE /admin/users/:id — delete user
- GET /admin/stats — aggregated platform stats (totalUsers, mostUsedChain, addressesPerChain, balancesPerChain)

### Example curl calls (with API key header)

Set the admin key in an environment variable for convenience:

```bash
export ADMIN_API_KEY=dev_admin_key_here
```

List users:

```bash
curl -sS -H "x-admin-key: $ADMIN_API_KEY" http://localhost:5500/admin/users | jq
```

Get user detail:

```bash
curl -sS -H "x-admin-key: $ADMIN_API_KEY" http://localhost:5500/admin/users/<userId> | jq
```

Create a user (admin):

```bash
curl -sS -X POST -H "x-admin-key: $ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"newuser@example.com","password":"secret123","firstName":"New","lastName":"User"}' \
  http://localhost:5500/admin/users | jq
```

Update user:

```bash
curl -sS -X PUT -H "x-admin-key: $ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Updated"}' \
  http://localhost:5500/admin/users/<userId> | jq
```

Delete user:

```bash
curl -sS -X DELETE -H "x-admin-key: $ADMIN_API_KEY" http://localhost:5500/admin/users/<userId> | jq
```

Get platform stats:

```bash
curl -sS -H "x-admin-key: $ADMIN_API_KEY" http://localhost:5500/admin/stats | jq
```

Expected `admin/stats` sample:

```json
{
  "totalUsers": 124,
  "mostUsedChain": { "chain": "eth", "count": 78 },
  "addressesPerChain": [
    { "chain": "eth", "count": 156 },
    { "chain": "btc", "count": 120 },
    { "chain": "xlm", "count": 20 }
  ],
  "balancesPerChain": [
    { "chain": "eth", "totalUSD": 12345.67 },
    { "chain": "btc", "totalUSD": 45678.9 }
  ]
}
```

Note: `balancesPerChain` requires a balances or transaction table with USD conversion — if not present the stat will return address counts only.

---

## Database checks & cleanup

Inspect users table (host or docker):

```bash
# If using host psql
psql "postgres://postgres:postgres@localhost:5432/velo_dev" -c "select id,email,isemailverified,createdat from users limit 10;"

# If using docker
docker exec -it <postgres_container_name> psql -U postgres -d velo_dev -c "select id,email,isemailverified,createdat from users limit 10;"
```

Delete a test user via SQL (careful):

```sql
DELETE FROM user_addresses WHERE userid = '<userId>';
DELETE FROM refresh_tokens WHERE userid = '<userId>';
DELETE FROM users WHERE id = '<userId>';
```

---

## Troubleshooting

- "relation \"users\" does not exist": ensure `NODE_ENV=development` is set during dev so TypeORM `synchronize` can create tables, or run migrations. If running in containerized mode, set `NODE_ENV=development` in the service `.env` temporarily.

- Docker daemon not running: start Docker Desktop and re-run `docker-compose up -d`.

- 500 internal server: check auth logs (`docker-compose logs -f auth` or terminal where `npm run dev` is running). Copy stack traces into the issue tracker or ask for help.

- Addresses not returned: ensure the register flow completed and DB saved addresses; check `user_addresses` table.

---

## Automated smoke test (suggestion)

Create a simple script `services/auth/scripts/smoke-test.sh` that:

- Waits for port 3002 to be open
- Registers a user
- Verifies response contains addresses
- Logs PASS/FAIL

(If you'd like, I can add and commit this script.)

---

## Security notes

- Never commit real secrets. Keep `.env` files local and add them to `.gitignore`.
- For production use Kubernetes Secrets / HashiCorp Vault / cloud provider secret stores — never plaintext `.env` in prod.
- Replace the placeholder `encrypt()` in `services/auth/src/utils/keygen.ts` with a proper KMS-based encryption for private keys.

---

If you want, I can:

- Add the `services/auth/scripts/smoke-test.sh` script and a `Makefile` target to run it.
- Implement the `GET /admin/:userId/addresses` endpoint and add a small Postman collection for manual QA.

Tell me which of those extras you want and I can add them next.
