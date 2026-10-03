# KashviMLM — Deployment Guide

Three services: the React frontend, the Express backend, and a PostgreSQL database.

```
Vercel (static React)  ──HTTPS──▶  Render (Express API)  ──▶  Neon (PostgreSQL)
   your-app.vercel.app               your-api.onrender.com
```

All three have free tiers. You can also do it all on Railway if you prefer one dashboard.

---

## Step 1 — Database (Neon)

1. Sign up at **neon.tech** → **New Project**.
2. Copy the **connection string**. It looks like:

   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. **Add the database name** — Neon gives you `neondb`, but the app expects `kashvimlm`. Either create a DB named `kashvimlm` in the Neon console, or just change `/neondb` to `/kashvimlm` in the string.
4. Keep `?sslmode=require` — Neon requires SSL.

---

## Step 2 — Backend (Render)

1. **render.com** → **New** → **Web Service** → connect your GitHub → pick `aniketch07/kashvimlm`.
2. Settings:

   | Field                 | Value                                              |
   | --------------------- | -------------------------------------------------- |
   | **Root Directory**    | `server`                                           |
   | **Runtime**           | Node                                               |
   | **Build Command**     | `npm install --include=dev && npx prisma generate && npm run build` |
   | **Start Command**     | `npm start`                                        |
   | **Health Check Path** | `/health`                                          |

   > ⚠️ **`--include=dev` is not optional.** Setting `NODE_ENV=production` (which you must, for runtime) makes npm skip `devDependencies` — but `typescript`, `@types/node`, `@types/express` and `prisma` all live there. Without the flag the build dies with ~100 errors like *"Cannot find name 'console'"* and *"Could not find a declaration file for module 'express'"*.
   >
   > ⚠️ **`npx prisma generate` is also required.** The repo's `build` script is only `tsc`, and npm may block Prisma's own install script — without this the server crashes at boot with *"Prisma Client could not locate the Query Engine"*.

3. **Environment variables** (Render → Environment):

   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://...your-neon-string...?sslmode=require
   JWT_SECRET=<paste a long random string, 32+ chars>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-app.vercel.app
   FRONTEND_URL=https://your-app.vercel.app
   APP_URL=https://your-app.vercel.app
   DEFAULT_SPONSOR_ID=88767139
   MINIMUM_QUALIFYING_BV=100
   BINARY_MATCH_PERCENTAGE=10
   TDS_DEDUCTION_PERCENTAGE=5
   ADMIN_FEE_PERCENTAGE=5
   ```

   `FRONTEND_URL` and `APP_URL` matter — they build the invite links. Miss them and every `join?ref=…` link breaks.

4. Deploy. You'll get a URL like `https://kashvimlm-api.onrender.com`. Check `https://kashvimlm-api.onrender.com/health` returns `{"status":"healthy"}`.

### 5. Create the tables (one time, from your machine)

The production database is empty. Run this locally with the Neon string pointing at it:

```bash
cd server
DATABASE_URL="postgresql://...your-neon-string...?sslmode=require" npx tsx src/database/initDb.ts
```

**Windows (PowerShell):**

```powershell
cd server
$env:DATABASE_URL="postgresql://..."; npx tsx src/database/initDb.ts
```

Expect `Database initialization completed successfully.`

> This **drops and recreates every table.** Run it once, never again once there's real data.

---

## Step 3 — Frontend (Vercel)

1. **vercel.com** → **Add New** → **Project** → import `aniketch07/kashvimlm`.
2. Settings:

   | Field                | Value         |
   | -------------------- | ------------- |
   | **Root Directory**   | `./` (leave default) |
   | **Framework Preset** | Vite          |
   | **Build Command**    | `npm run build` |
   | **Output Directory** | `dist`        |

3. **Environment variable** — set this **before** deploying:

   ```
   VITE_API_URL=https://kashvimlm-api.onrender.com/api
   ```

   Note the **`/api` on the end** — it's required. No trailing slash.

4. Deploy → you get `https://your-app.vercel.app`.

5. **Go back to Render** and update `CLIENT_URL`, `FRONTEND_URL`, `APP_URL` to this exact Vercel URL, then let it redeploy. CORS will reject the frontend until you do.

---

## Step 4 — Test

Open the Vercel URL:

- **Log in:** `rahul.kaushal@kashvimlm.com` / `password123`
- Open the tree — should render without errors
- Open an invite link — sponsor should validate

---

## Things that will bite you

**VITE_API_URL is baked in at build time.** Change it → you must redeploy the frontend. It's not read at runtime.

**No `.env` files are in the repo** (gitignored, deliberately). Every variable above must be typed into the Render/Vercel dashboards.

**Your demo accounts won't exist in production.** The 3 `demo.member*@kashvimlm.test` accounts live in your local database only. Production starts with the 9 seeded distributors + the admin. Create new ones through the `/join` page, or register normally.

**The seeded distributors can't log in.** `KV-1002` through `KV-1009` have a placeholder password hash in `seed.sql` — no password works for them. Only the admin account is usable.

**Render's free tier sleeps** after 15 minutes idle. The first request after that takes ~50 seconds to wake. For a client demo, hit the backend URL a minute beforehand, or upgrade to the paid tier.

**Generate a real `JWT_SECRET`.** Don't reuse the dev one from `SETUP.md`. Any of these works:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Production rate limits are strict** — 300 requests/15min, 25 on login. That's intentional. The infinite-loop bug that was burning it is fixed, so normal use won't trip it.
