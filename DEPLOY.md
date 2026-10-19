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

**`ezri-api`** — New → Web Service → Python

- Build command: `pip install -r api/requirements.txt`
- Start command: `uvicorn server:app --app-dir api --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`
- Environment: `DATABASE_URL`, PayPal, Upstash, and Cloudflare R2 values from
  `.env.example` (set them in the dashboard only — never in git)
- `CORS_ALLOWED_ORIGINS`: your web URL, e.g. `https://ezri-web.onrender.com`

### 4. Point the web build at the API

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time. Set a
repository variable (**Settings → Secrets and variables → Actions → Variables**):

```
NEXT_PUBLIC_API_URL = https://ezri-api.onrender.com
```

If your API service has a different name, set the real URL. Changing it
requires a new image build (push to `main`, or re-run the workflow).

### 5. Optional: auto-deploy after a green build

Render → `ezri-web` → **Settings → Deploy Hook** → copy the URL. Add it to
GitHub as the repository secret `RENDER_DEPLOY_HOOK_URL`. The workflow then
triggers Render after every successful image push. Without it, click
**Manual Deploy → Deploy latest commit** in Render after CI is green.

## Local rules

- **Never run `pnpm build` locally.** It is the exact workload that exhausted
  the laptop and Render. CI performs every production build.
- Safe local commands: `pnpm dev`, `pnpm typecheck`, `pnpm test`.
- Do not commit `.next/`, `node_modules/`, or build artifacts.

## Fallback: Git-backed Node service

If image deploys are not available on your Render plan, the same repository
still deploys as a normal Node service now that the 34 MB Bryntum trial bundle
is gone:

- Runtime: **Node**, Root Directory: `web`
- Build: `pnpm install --frozen-lockfile && pnpm run build`
- Start: `./node_modules/.bin/next start -p $PORT`

This build runs on Render's 8 GB pipeline and may still be tight; the image
path above is the guaranteed one.

## Rollback

Every image is tagged `sha-<commit>`. To roll back, point the Render service at
a previous tag and deploy. No rebuild required.
