# 🚀 BookSync — Deployment Guide

This guide provides step-by-step instructions to deploy **BookSync** (Django + React/Vite + PostgreSQL + Nginx) to production.

---

## 🏆 Option 1: VPS Deployment (DigitalOcean / AWS EC2 / Hetzner) — *Recommended*

Since BookSync is already fully containerized with `docker-compose.yml`, deploying to a single Ubuntu Virtual Private Server (VPS) is the simplest, most cost-effective approach.

### Step 1: Provision your Server
* Provision a $5–$10/mo Ubuntu 22.04 / 24.04 VPS (DigitalOcean Droplet, AWS EC2 t3.small, or Hetzner Cloud).

### Step 2: Install Docker & Docker Compose
Log into your server via SSH and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
```

### Step 3: Clone Repository & Setup Environment
```bash
git clone https://github.com/Kanishjain07/ahoum.git /var/www/booksync
cd /var/www/booksync

# Create production .env
cp .env.example .env
nano .env
```

Set production values in `.env`:
```ini
DEBUG=False
SECRET_KEY=your-ultra-secure-django-secret-key
DEV_FAKE_OAUTH=False
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
DATABASE_URL=postgres://postgres:postgres@db:5432/ahoum
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Step 4: Start Docker Compose Stack
```bash
docker compose up -d --build
```

### Step 5: Enable SSL (HTTPS) with Let's Encrypt / Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🚂 Option 2: Railway.app (One-Click GitHub Integration)

Railway natively supports multi-container Docker Compose builds directly from GitHub.

1. Sign up at [Railway.app](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo** → select `Kanishjain07/ahoum`.
3. Add a **PostgreSQL Database** plugin in Railway.
4. Set Environment Variables in Railway settings (`SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.).
5. Railway will automatically build and deploy your containers and give you a public `https://...up.railway.app` URL.

---

## ⚡ Option 3: Render.com

1. Sign up at [Render.com](https://render.com/).
2. **Database**: Create a **New PostgreSQL** instance. Copy the Internal Database URL.
3. **Web Service**: Create a **New Web Service**, connect `Kanishjain07/ahoum`.
4. Select **Docker** environment.
5. Set Environment Variables (`DATABASE_URL`, `SECRET_KEY`, etc.).
6. Click **Deploy**.

---

## 📋 Production Verification Checklist

Once deployed, verify your live URL:

- [ ] `GET /api/healthz/` returns `{"status": "ok"}`
- [ ] Database migrations run automatically via container entrypoint
- [ ] Google & GitHub OAuth redirect URIs point to your production domain:
  - `https://yourdomain.com/auth/callback/google`
  - `https://yourdomain.com/auth/callback/github`
- [ ] `docker compose exec backend python manage.py test tests` passes cleanly
