Monorepo dev guide

Services:

- services/payment
- services/auth
- services/swap
- services/admin
- services/blog

Packages:

- packages/shared

Run locally with docker-compose:

```bash
docker-compose up --build
```

Start a single service locally (example):

```bash
cd services/payment
npm install
npm run dev
```
