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

### 4. Point the web build at the API

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time. The
API is served at `https://api.ezri-africa.com`.

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

## Custom domain: ezri-africa.com

The domain's DNS is managed by **Cloudflare**. Today the apex and `www` point
at a different Vercel site (the career platform). Moving them to Render takes
that site offline.

**Safe order:** if you want to keep the career site, first add
`careers.ezri-africa.com` to the Vercel project, create the matching Cloudflare
CNAME, and confirm it loads. Only then move the main records.

1. Render → the production web service (currently `ezri-africa`) →
   **Settings → Custom Domains** → add:
   - `ezri-africa.com`
   - `www.ezri-africa.com`
2. In Cloudflare DNS, replace the current Vercel records:
   - Delete the apex `A` records (currently `64.29.17.1`, `216.198.79.1`).
   - Delete the `www` CNAME (currently `b231e7ad6bfbe744.vercel-dns-017.com`).
   - Add `www` **CNAME** → the target Render shows
     (normally `ezri-africa.onrender.com`).
   - Add apex `@` **CNAME** → the same Render target, using Cloudflare's
     automatic CNAME flattening. If you prefer an `A` record, use the IP
     Render displays in the custom-domain panel.
   - Keep both records **DNS only (grey cloud)** until Render has issued the
     TLS certificate. You can enable the Cloudflare proxy afterwards.
3. Wait for Render to show the domain as **Verified** with an active
   certificate.
4. Set the API's `CORS_ALLOWED_ORIGINS` to
   `https://ezri-africa.com,https://www.ezri-africa.com,https://ezri-africa.onrender.com`.
5. Set `NEXT_PUBLIC_API_URL` to the API's URL and redeploy the web service.

### API subdomain: api.ezri-africa.com

1. Render → `ezri-api` → **Settings → Custom Domains** → add
   `api.ezri-africa.com`. Render displays the CNAME target
   (`ezri-api.onrender.com`).
2. Cloudflare DNS → add `api` **CNAME** → the target Render shows,
   **DNS only (grey cloud)**, so Render can issue the certificate.
3. Wait for Render to report it verified with an active certificate, then
   test `https://api.ezri-africa.com/api/health`.

The API stays reachable at `https://ezri-api.onrender.com` as a fallback.
Hobby workspaces include 2 custom domains; if the web service already uses
both, Render charges $0.25/month for the API subdomain.

The `https://ezri-africa.onrender.com` URL keeps working after the domain is
attached, so it remains a safe fallback for the demo.

## Local rules

- **Never run `pnpm build` locally.** It is the exact workload that exhausted
  the laptop and Render. CI performs every production build.
- Safe local commands: `pnpm dev`, `pnpm typecheck`, `pnpm test`.
- Do not commit `.next/`, `node_modules/`, or build artifacts.

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
