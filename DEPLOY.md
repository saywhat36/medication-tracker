# Deploying the API

The API is a Docker service that talks to your hosted Postgres (Neon). The
reminder cron runs separately in GitHub Actions, so the only job of the hosted
API is to serve the web/widget clients.

Recommended host: **Render** (free tier, no credit card). The free tier sleeps
after ~15 min idle, so the first request after a pause takes ~30–60s to wake —
fine for personal use.

## What you need first

- Your **Neon** connection string (the `DATABASE_URL`).
- An **API token** — generate one and keep it safe:
  ```
  openssl rand -hex 32
  ```

## Option A — Blueprint (uses `render.yaml`)

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Connect this GitHub repo. Render reads `render.yaml`.
3. When prompted, fill the two secret env vars:
   - `DATABASE_URL` = your Neon string (include `?sslmode=require`)
   - `API_TOKEN` = the random token you generated
4. **Apply** / **Create**. Render builds the Dockerfile and deploys.

## Option B — Manual web service

1. **New** → **Web Service** → connect this repo.
2. Settings:
   - Runtime: **Docker** (it uses `./Dockerfile`)
   - Health check path: `/health`
   - Instance type: **Free**
3. Add environment variables:
   - `DATABASE_URL` = your Neon string
   - `API_TOKEN` = your random token
   - `APP_TIMEZONE` = `Europe/London`
   - (Don't set `PORT` — Render injects it; the app reads it.)
4. **Create Web Service**.

## Verify

Render gives you a URL like `https://medication-tracker-api.onrender.com`.

```
# public, should return {"ok":true}
curl https://<your-service>.onrender.com/health

# protected — 401 without the token, your data with it
curl https://<your-service>.onrender.com/medications
curl -H "Authorization: Bearer <API_TOKEN>" https://<your-service>.onrender.com/medications
```

On first deploy the API runs the database migrations against Neon automatically.

## Notes / next steps

- **Same `DATABASE_URL` as the reminder cron** so the API, the cron, and you all
  share one database (Neon).
- This API is reachable by anyone who has the token. The hosted **website** can't
  safely hold a token in a public bundle, so the next step is a proper **login**,
  followed by **CORS** config so the browser can call the API cross-origin.
- Cheaper-but-faster alternative: Fly.io (needs a card) wakes in ~1–2s and runs
  the same Docker image.
