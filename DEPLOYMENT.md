# Deploying the Refactored Frontend to EC2

## Overview

The backend (`advika_v2`) runs as-is on EC2 — **nothing about it changes**.
You are only deploying the new React frontend (`advika_billing_refactored`).

The React app is a static site after `npm run build`. You build it locally,
copy the `build/` folder to the EC2, and tell Nginx (or whatever serves your
frontend) to point at it. The backend never restarts.

---

## What is NOT changing on EC2

- The `advika_v2` Node.js server — same code, same port, same PM2 process
- The MySQL database — untouched
- All `.env` variables on the EC2
- Nginx config for the backend (port 5000 proxy)
- Migrations, seeders, cron jobs, S3 uploads — all untouched

---

## Step 1 — Build locally

On your local machine inside the refactored project folder:

```bash
# 1. Create your .env file (only needed for build)
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_API_URL=https://your-ec2-domain-or-ip/api
```

Use whatever URL the EC2 backend is already reachable at. If you access it
as `http://13.x.x.x:5000/api` then use that exactly.

```bash
# 2. Install dependencies
npm install

# 3. Build production bundle
npm run build
```

This creates a `build/` folder — a set of static HTML/CSS/JS files.
This folder is the only thing that goes to EC2.

---

## Step 2 — Check what's currently serving the frontend on EC2

SSH into EC2 and run:

```bash
# See what Nginx config exists
sudo cat /etc/nginx/sites-enabled/*

# Or if Apache
sudo cat /etc/apache2/sites-enabled/*

# See what's running
pm2 list
sudo systemctl status nginx
```

This tells you:
- Which port/path the old frontend lives at
- Where its files sit (e.g. `/var/www/html` or `/home/ubuntu/advika_billing_app/build`)

---

## Step 3 — Back up the old frontend on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Back up old build — adjust path to wherever your old frontend build lives
sudo cp -r /var/www/html /var/www/html_backup_$(date +%Y%m%d)

# Verify backup exists
ls /var/www/
```

---

## Step 4 — Copy new build to EC2

From your **local machine**:

```bash
# Replace the path with wherever EC2 serves the frontend from
# (the path you found in Step 2)
scp -i your-key.pem -r build/* ubuntu@your-ec2-ip:/var/www/html/
```

If the frontend and backend are in the same project folder (e.g. backend serves
the React build as static files via Express), copy to the backend's public dir:

```bash
scp -i your-key.pem -r build/* ubuntu@your-ec2-ip:~/advika_v2/public/
```

---

## Step 5 — Verify Nginx is set up for React Router

React Router uses client-side routing. Without this Nginx rule, refreshing any
page other than `/` returns a 404.

```bash
sudo nano /etc/nginx/sites-enabled/default
```

Your server block should include this `try_files` line:

```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    # Serve React frontend
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # <-- this line is critical
    }

    # Proxy API calls to the Node backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

If that `try_files` line is already there, no change needed.
If it's missing, add it, then:

```bash
sudo nginx -t           # test config — must say "syntax is ok"
sudo systemctl reload nginx
```

---

## Step 6 — Verify backend is still running

```bash
pm2 list                # should show advika_v2 as "online"
pm2 logs advika_v2 --lines 20   # check for any errors
curl http://localhost:5000/api/products/getproduct   # should return JSON
```

If the backend had stopped for any reason:
```bash
cd ~/advika_v2
pm2 restart advika_v2
```

---

## Step 7 — Test the deployment

Open your EC2 URL in a browser.

Checklist:
- [ ] Login page loads (Advika Flowers branding)
- [ ] OTP is sent to email
- [ ] After OTP, browser redirects to `/billing` and dashboard loads
- [ ] Products appear in billing dropdown
- [ ] Daily transactions page loads data
- [ ] Inventory page loads and shows products

---

## Rollback (if anything goes wrong)

```bash
# On EC2 — restore the backup from Step 3
sudo rm -rf /var/www/html/*
sudo cp -r /var/www/html_backup_YYYYMMDD/* /var/www/html/
sudo systemctl reload nginx
```

The backend never changed so rollback is purely a file swap.

---

## Common issues

**CORS error in browser console**

The backend already has `cors({ origin: true })` which allows all origins.
If you see CORS errors, the `REACT_APP_API_URL` in your `.env` is wrong — it
must match the exact URL the browser uses to reach the backend.

**401 on every API call after login**

The token is now stored correctly. If you still see 401s, the backend's
`JWT_SECRET` env var on EC2 may differ from what was used to sign old tokens.
Clear localStorage in the browser and log in fresh.

**Blank page after deploy**

Check browser console for a path error. Make sure `REACT_APP_API_URL` was set
correctly before running `npm run build` — it gets baked into the bundle at
build time and cannot be changed after without rebuilding.

**React Router 404 on page refresh**

The `try_files $uri $uri/ /index.html` Nginx rule is missing. Add it (Step 5).
