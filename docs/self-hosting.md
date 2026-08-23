# Self-Hosting RadarFlow

RadarFlow is engineered for easy self-hosting. You can run it either via **Docker Compose** (recommended for production and cloud VMs) or directly via **Node.js / pnpm** for local environments.

---

## 🐳 Option 1: Docker Compose (Production / VM)

The root [`docker-compose.yml`](../docker-compose.yml) provides a complete, production-ready stack comprising:
- **`radarflow-web`**: Next.js 15 server hosting both the web dashboard and ingestion API.
- **`radarflow-postgres`**: PostgreSQL 16 database with persistent storage.
- **`radarflow-redis`**: Redis 7 cache for rate limiting and fast lookups.

### Step 1: Clone Repository

```bash
git clone https://github.com/Mohammad-Shoeb-Faizan/RadarFlow.git
cd RadarFlow
```

### Step 2: Configure Environment Variables

Copy the example environment template:

```bash
cp .env.example .env
```

Edit `.env` with your preferred settings:

```env
# Database URL
DATABASE_URL=postgresql://radarflow:radarflow_secret@postgres:5432/radarflow_db

# Redis URL
REDIS_URL=redis://redis:6379

# Public URL of your deployment
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Strong random secret for signing JWT sessions (generate with: openssl rand -base64 32)
AUTH_SECRET=your-random-32-byte-secret-key-here

# Optional: Google Gemini API Key for AI root cause analysis
GEMINI_API_KEY=

# Ingestion rate limit (requests per minute)
INGESTION_RATE_LIMIT=1000
```

### Step 3: Start the Stack

```bash
docker compose up -d
```

Check container status and logs:

```bash
docker compose ps
docker compose logs -f web
```

Once running, navigate to `http://localhost:3000` (or your server's domain).

---

## 💻 Option 2: Local Development

For local development or testing without Docker, RadarFlow can run directly on Node.js using SQLite / LibSQL:

### Prerequisites
- **Node.js**: v18.18.0 or higher
- **pnpm**: v9.0.0 or higher

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Seed development database
pnpm run db:seed

# 3. Start development server
pnpm dev
```

The application will start at `http://localhost:3000`. By default, local development uses SQLite in WAL mode stored at `./data/radarflow.db`.

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection URI for PostgreSQL (`postgresql://...`) or SQLite (`file:./data/radarflow.db`). |
| `AUTH_SECRET` | Yes | - | Secret string used to sign and verify JWT session cookies. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Canonical URL of your RadarFlow instance. |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL for rate limiting and session caching. |
| `GEMINI_API_KEY` | No | `""` | Google Gemini API key for AI root-cause analysis. |
| `INGESTION_RATE_LIMIT`| No | `1000` | Ingestion threshold (requests per minute per API key). |
| `DEMO_ADMIN_EMAIL` | No | `admin@radarflow.io` | Default administrator email for the seed script. |
| `DEMO_ADMIN_PASSWORD`| No | `admin123` | Default administrator password for the seed script. |

---

## 💾 Data Persistence & Backups

In Docker Compose, three named volumes persist all data:

- `pg_data`: Stores all PostgreSQL tables (metrics, logs, traces, incidents, users, projects).
- `redis_data`: Persists Redis rate limiting state.
- `radarflow_data`: Internal application storage.

### PostgreSQL Backup

```bash
docker exec -t radarflow-postgres pg_dump -U radarflow radarflow_db > backup_$(date +%Y%m%d).sql
```

### PostgreSQL Restore

```bash
cat backup_20260824.sql | docker exec -i radarflow-postgres psql -U radarflow -d radarflow_db
```

---

## 🔒 Security & Production Checklist

1. **Replace `AUTH_SECRET`**: Never deploy with default or example secrets. Generate a strong key:
   ```bash
   openssl rand -base64 32
   ```
2. **Reverse Proxy & SSL/TLS**: Place RadarFlow behind a reverse proxy (such as NGINX, Caddy, or Cloudflare) to terminate HTTPS.
3. **Change Default Credentials**: If you ran `pnpm run db:seed`, log into `/settings` and rotate your credentials, or configure `DEMO_ADMIN_PASSWORD` in `.env` before running the seed script.
4. **API Key Rotation**: Use the **Settings > API Keys** tab to create distinct API keys for each microservice and revoke inactive keys immediately.

---

## 🔄 Updating RadarFlow

To update your self-hosted Docker deployment to the latest version:

```bash
git pull origin main
docker compose build --no-cache web
docker compose up -d
```
