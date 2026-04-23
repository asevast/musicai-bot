# Cloudflare Pages Deployment

## Build Configuration

| Setting        | Value                                 |
| -------------- | ------------------------------------- |
| Build Command  | `pnpm --filter @musicai/webapp build` |
| Build Output   | `dist`                                |
| Root Directory | `apps/webapp`                         |
| Node Version   | 20                                    |

## Environment Variables

Required in Cloudflare Pages dashboard:

- `VITE_API_URL` — Production API endpoint (e.g., `https://api.musicai.bot`)

Optional:

- `VITE_BOT_USERNAME` — For direct Telegram links

## SPA Configuration

- `vite.config.ts` has `base: '/'`
- `dist/index.html` is the fallback for all routes
- React Router handles client-side routing

## CORS

API CORS allows:

- `WEBAPP_URL` env var
- `https://web.telegram.org`
- `https://*.telegram.org`

Update `apps/api/src/modules/tracks/tracks.gateway.ts` if deploying to custom domain.

## Smoke Test

```bash
# Verify build works
pnpm --filter @musicai/webapp smoke

# Verify API connectivity (requires running API)
curl "$VITE_API_URL/health"
```
