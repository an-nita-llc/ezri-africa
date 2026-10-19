# Deployment

Ezri ships as two Render services:

| Service | Runtime | Built by | Notes |
| --- | --- | --- | --- |
| `ezri-api` | Python | Render (small build) | FastAPI, health check `/api/health` |
| `ezri-web` | Docker image | **GitHub Actions** (16 GB runner) | Next.js standalone server |

The web production build **never runs on a laptop and never runs on Render's
8 GB Starter build pipeline**. CI is the only build authority:

```
push to main
  └─ GitHub Actions: typecheck + unit tests
       └─ docker build (Next.js standalone, 16 GB runner)
            └─ push ghcr.io/an-nita-llc/ezri-web:latest + sha-<commit>
                 └─ Render pulls the image and runs it
```

## One-time setup

### 1. Publish the image

Push to `main` and open the **Actions** tab. The `Web CI + image` workflow
runs typecheck, unit tests, and the production build, then pushes the image to
GHCR.

### 2. Let Render pull the image

The package is private by default. Pick one:

- **Public package (simplest):** GitHub → your profile → **Packages** →
  `ezri-web` → **Package settings** → **Change visibility** → **Public**.
- **Private package:** GitHub → **Settings → Developer settings → Personal
  access tokens** → create a token with `read:packages`; then in Render →
  **Account Settings → Registry Credentials** → add a GitHub Container
  Registry credential.

### 3. Create the Render services

Apply `render.yaml` as a Blueprint, or create them manually:

**`ezri-web`** — New → Web Service → **Existing Image**

- Image URL: `ghcr.io/an-nita-llc/ezri-web:latest`
- Instance type: Free
- Health check path: `/`
- No build command, no start command — the image listens on `$PORT`
- Name it `ezri-africa` if you want to keep the current public URL; otherwise
  use `ezri-web` and update `CORS_ALLOWED_ORIGINS` accordingly

**`ezri-api`** — New → Web Service → Python

- Build command: `pip install -r api/requirements.txt`
- Start command: `uvicorn server:app --app-dir api --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`
- Required environment variable:
  `CORS_ALLOWED_ORIGINS=https://ezri-africa.com,https://www.ezri-africa.com,https://ezri-africa.onrender.com`
  (comma-separated, no spaces). Without it the API only trusts
  `an-nita.com` and the site's calls are blocked by the browser.
- Everything else is optional — with **zero keys** the API runs in full demo
  mode: mock PayPal, SQLite storage, in-process cache, heuristic AI guard.
  Set `DATABASE_URL` (Prisma Postgres) only if you want data to survive
  restarts and redeploys. PayPal/Upstash/R2/OpenRouter values come from
  `.env.example` — dashboard only, never in git.
- Optional delivery/config variables on `ezri-api`:
  - `NOTIFY_WEBHOOK_URL` — a Zapier **Catch Hook** (or Make/webhook.site).
    Every lifecycle event POSTs there as JSON, and the auth events carry the
    sign-in code (`auth.otp_requested`) / reset link (`auth.reset_requested`)
    so Zapier can deliver real email or SMS with no mail server. Unset: the
    app stays fully usable — the code and demo reset link are shown on screen.
  - `WEB_BASE_URL` — origin used in reset links handed to the webhook.
    Defaults to `https://ezri-africa.com`.

### 4. Point the web build at the API

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time. The
API is served at `https://api.ezri-africa.com` — the web client code also
defaults to that same URL at runtime, so a build made without the variable
still targets the deployed API.

- **Git-backed Node service** (currently live): set the variable in Render →
  web service → **Environment**, then redeploy — a rebuild is required so the
  value gets inlined.
- **Image path**: set this repository variable
  (**Settings → Secrets and variables → Actions → Variables**):

```
NEXT_PUBLIC_API_URL = https://api.ezri-africa.com
```

Changing it requires a new image build (push to `main`, or re-run the
workflow). The raw `ezri-api.onrender.com` URL keeps working as a fallback.

### 5. Optional: auto-deploy after a green build

Render → `ezri-web` → **Settings → Deploy Hook** → copy the URL. Add it to
GitHub as the repository secret `RENDER_DEPLOY_HOOK_URL`. The workflow then
triggers Render after every successful image push. Without it, click
**Manual Deploy → Deploy latest commit** in Render after CI is green.

## Custom domains (live)

All three hostnames are attached to their Render services, verified, and
serving with active TLS certificates:

| Domain | Render service | Cloudflare record (Annita LLC zone) |
| --- | --- | --- |
| `ezri-africa.com`, `www.ezri-africa.com` | `ezri-web` | apex `@` and `www` → `ezri-africa.onrender.com`, **DNS only (grey cloud)** |
| `api.ezri-africa.com` | `ezri-api` | `api` CNAME → `ezri-api.onrender.com`, **DNS only (grey cloud)** |

- The old Vercel career-site records on the apex were removed; the Render web
  service serves `ezri-africa.com`.
- Cloudflare email records (MX / DKIM / SPF / DMARC) were left untouched.
- Render URL fallbacks keep working: `ezri-africa.onrender.com` (web),
  `ezri-api.onrender.com` (API).
- Hobby workspaces include 2 custom domains; the third costs $0.25/month.

To attach another hostname later: Render → service → **Settings → Custom
Domains** → add it, then add the CNAME Render shows in Cloudflare DNS with the
proxy **off (grey cloud)**, and wait for *Verified*.

The `https://ezri-africa.onrender.com` URL keeps working after the domain is
attached, so it remains a safe fallback for the demo.

## Local rules

- **Never run `pnpm build` locally.** It is the exact workload that exhausted
  the laptop and Render. CI performs every production build.
- Safe local commands: `pnpm dev`, `pnpm typecheck`, `pnpm test`.
- Fully-local stacks: set `NEXT_PUBLIC_API_URL` and `CORS_ALLOWED_ORIGINS`
  explicitly — the code defaults point at the deployed production URLs.
- Do not commit `.next/`, `node_modules/`, or build artifacts.

## Local environment (`.env`)

Both env files are gitignored; templates are committed.

```powershell
Copy-Item .env.example .env                 # API gateway keys
Copy-Item web/.env.example web/.env.local   # Next.js keys
```

- The API loads the repo-root `.env` automatically (`api/env_loader.py`,
  python-dotenv) **without overriding** real process env — so Render dashboard
  values always win and this file is invisible in production.
- The web reads `web/.env.local`; `NEXT_PUBLIC_*` values are inlined at
  dev/build start, so restart `pnpm dev` after editing.
- `GET /api/health` reports what the gateway actually picked up:
  `db` (`postgres` / `sqlite`), `ai_guard` (`openrouter` / `heuristic`),
  `mock_paypal`, and `notify_webhook`. Use it to confirm keys without
  exposing secrets.
- With every secret blank the gateway still runs the full zero-key demo:
  mock PayPal, SQLite, heuristic AI guard.

## Neon Postgres (current database)

The repo carries the Neon policy in `neon.ts` and is linked to project
`orange-frog-32627767`, branch `production`. The local link file `.neon` is
gitignored, so a fresh clone links once:

```powershell
neon login
neon link --project-id orange-frog-32627767 --branch production
neon deploy          # apply the branch policy + pull env vars into .env
```

`neon deploy` writes two values into `.env`:

- `DATABASE_URL` — pooled (`-pooler` host); used for normal application traffic.
- `DATABASE_URL_UNPOOLED` — direct; used only for the one-time schema creation in
  `api/ledger.py`, per Neon's guidance. Pooled connections are for queries;
  schema work goes over the direct endpoint.

Add both to Render `ezri-api`, plus `OPENROUTER_API_KEY` and
`NOTIFY_WEBHOOK_URL`. `GET /api/health` should then report
`db: "postgres"`, `ai_guard: "openrouter"`, and `notify_webhook: true`.

## Fallback: Git-backed Node service (currently live)

The current deployment at `https://ezri-africa.onrender.com` uses this path.
It works as a normal Node service now that the 34 MB Bryntum trial bundle is
gone:

- Runtime: **Node**, Root Directory: `web`
- Build: `pnpm install --frozen-lockfile && pnpm run build`
- Start: `./node_modules/.bin/next start -p $PORT`

This build runs on Render's 8 GB pipeline; the image path above is the
guaranteed one and does not depend on Render's build memory at all.

## Rollback

Every image is tagged `sha-<commit>`. To roll back, point the Render service at
a previous tag and deploy. No rebuild required.
