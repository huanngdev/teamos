# Deployment

TeamOS deploys as one Docker Compose stack on a single host. The reference target is an Oracle Cloud Always Free Ampere (ARM) VM, but any Linux host with Docker works.

## What runs

| Service    | Image                         | Role                                                                   |
| ---------- | ----------------------------- | ---------------------------------------------------------------------- |
| `caddy`    | `Dockerfile` target `web`     | HTTPS, static web build, and reverse proxy for `/api/*` and `/health*` |
| `api`      | `Dockerfile` target `api`     | Bundled Hono API on Bun, started only after migrations succeed         |
| `migrate`  | `Dockerfile` target `migrate` | Runs `drizzle-kit migrate` once per `up`, then exits                   |
| `postgres` | `postgres:16-alpine`          | Durable data                                                           |
| `redis`    | `redis:7-alpine`              | Rate limiting                                                          |
| `minio`    | `quay.io/minio/minio`         | Object storage, internal only                                          |

Only Caddy publishes ports (80 and 443). The web app and the API share one origin, `https://APP_DOMAIN`, so the session cookie is first-party and no CORS preflight is needed. Caddy obtains and renews the certificate on its own. `TRUST_PROXY=true` lets the API rate-limit by the client address Caddy reports instead of Caddy's own address.

Files: `compose.prod.yaml`, `Dockerfile`, `.dockerignore`, `deploy/Caddyfile`, and `.env.production.example`.

## 1. Prepare the server

1. Create an Ampere A1 instance with Ubuntu 24.04. 2 OCPU and 12 GB is enough. Reserve its public IP so it does not change.
2. In the instance's VCN security list, add ingress rules for TCP 80 and TCP 443 from `0.0.0.0/0`.
3. Oracle's Ubuntu image also rejects inbound traffic in `iptables`. Open the same ports there:

   ```sh
   sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
   sudo netfilter-persistent save
   ```

4. Install Docker and log in again so the group change applies:

   ```sh
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker "$USER"
   ```

## 2. Point a domain at it

Create a DNS `A` record from your hostname to the reserved IP. A free DuckDNS name such as `teamos.duckdns.org` works. Caddy cannot issue a certificate until the record resolves to the server.

## 3. Register OAuth callbacks

Production requires both providers. Use these callback URLs:

- Google: `https://APP_DOMAIN/api/auth/callback/google`
- GitHub: `https://APP_DOMAIN/api/auth/callback/github`

## 4. Configure

```sh
git clone <repository-url> teamos && cd teamos
cp .env.production.example .env
cp apps/api/.env.example apps/api/.env
```

In the root `.env`, set `APP_DOMAIN` and generate each password with `openssl rand -hex 32`. The passwords are embedded in connection URLs, so keep them hex. `COMPOSE_FILE=compose.prod.yaml` lets a plain `docker compose` use the production file.

In `apps/api/.env`, set:

- `BETTER_AUTH_SECRET` from `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`. Oracle Cloud blocks outbound port 25, so use 465 or 587.

`compose.prod.yaml` overrides `NODE_ENV`, `PORT`, `TRUST_PROXY`, the public URLs, and every database, Redis, and MinIO connection value, so their entries in `apps/api/.env` do not matter. `API_DOCS_ENABLED` has no effect because Caddy does not proxy `/docs`.

## 5. Start

```sh
docker compose up -d --build
docker compose ps
curl https://APP_DOMAIN/health/ready
```

The first build takes a few minutes. `migrate` should show `Exited (0)` and every other service `healthy`. Use `docker compose logs -f api caddy` when something does not start. The API exits with the missing variable names when its production configuration is incomplete.

## Update

```sh
git pull
docker compose up -d --build
docker image prune -f
```

Migrations run before the new API container starts. A failed migration leaves the previous API stopped, so check `docker compose logs migrate`.

## Back up and restore

```sh
docker compose exec -T postgres pg_dump -U teamos -Fc teamos > teamos-$(date +%F).dump
docker compose exec -T postgres pg_restore -U teamos -d teamos --clean --if-exists < teamos-2026-01-01.dump
```

Copy dumps off the VM. A daily `cron` entry that runs the dump and uploads it elsewhere is enough for now. Redis holds only rate-limit counters. MinIO holds no application objects yet.

## Try it locally

Set `APP_DOMAIN=localhost` in a separate env file and run `docker compose --env-file <file> -f compose.prod.yaml up -d --build`. Caddy serves a locally trusted certificate on `https://localhost`. OAuth sign-in only works when the providers list `https://localhost` callbacks. Remove the stack with `down -v`.

## Limits

- One host: no failover, and a VM reboot is downtime. `restart: unless-stopped` brings the stack back after Docker starts.
- Oracle may reclaim Always Free instances that stay idle for a long time. Upgrading the tenancy to pay-as-you-go keeps the free allowance and avoids that.
- Secrets live in two `.env` files on the server. There is no secret manager.
- Backups are manual until a scheduled job exists.
