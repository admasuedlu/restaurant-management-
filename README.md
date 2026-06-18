# Habesha Restaurant OS

Full-stack multi-tenant restaurant POS system built for Ethiopian restaurants.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express.js (TypeScript)
- **Database**: PostgreSQL
- **Auth**: JWT (12-hour sessions) + bcrypt PINs
- **Payments**: Chapa (Ethiopian fintech)
- **AI**: Google Gemini 1.5 Flash (business insights)

## Quick Start

**Prerequisites:** Node.js 20+, PostgreSQL

1. Copy env template and fill in values:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development:
   ```bash
   npm run dev
   ```

## Production

```bash
npm run build
npm start
```

Or with Docker:
```bash
docker build -t habesha-os .
docker run -p 3000:3000 --env-file .env habesha-os
```

## Environment Variables

See `.env.example` for the full list. Required in production:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `ADMIN_KEY` | Superadmin API key |
| `SUPER_ADMIN_EMAIL` | Superadmin login email |
| `SUPER_ADMIN_PASSWORD` | Superadmin login password |

## Multi-Tenant Architecture

Each restaurant is a **tenant** with its own:
- Staff, menu, inventory, orders, branches
- Subscription plan (trial / starter / professional / enterprise)
- Isolated data via `tenant_id` on every DB row

## Subscription Plans

| Plan | Price | Branches | Staff | AI Insights |
|---|---|---|---|---|
| Trial | Free (14 days) | 1 | 5 | No |
| Starter | 499 ETB/mo | 1 | 15 | No |
| Professional | 1,499 ETB/mo | 3 | 50 | Yes |
| Enterprise | 3,999 ETB/mo | 99 | 9,999 | Yes |
