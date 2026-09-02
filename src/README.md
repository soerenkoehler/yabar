# YABAR Cloudflare Source

This directory contains the Cloudflare application and deployment code.

## Architecture

One Worker deployment contains the API and the static frontend assets from
`public`.

The cleanup job runs as a Workers scheduled trigger every minute.

## GitHub Actions

The Cloudflare deployment workflow is
[`.github/workflows/cloudflare.yml`](../.github/workflows/cloudflare.yml).

### Secrets

| Name                        | Description                                          |
|-----------------------------|------------------------------------------------------|
| `CLOUDFLARE_API_TOKEN`      | Cloudflare API token with Workers and D1 permissions |
| `CLOUDFLARE_ACCOUNT_ID`     | Cloudflare account ID                                |
| `CLOUDFLARE_D1_DATABASE_ID` | D1 database ID used by the deployment script         |

## Preparation

Create these Cloudflare resources manually before the first deployment:

1. A D1 database bound to the Worker as `DB`.
2. A Cloudflare Access application and policy that protects the Worker endpoint
   or custom domain, including both the frontend and `/api/*`.

Set `CLOUDFLARE_D1_DATABASE_ID` to the real D1 database ID before deploying.
The deployment script injects it into a temporary Wrangler config, applies the
D1 migrations, then deploys the Worker and assets. The migrations are in
`d1/migrations`.
