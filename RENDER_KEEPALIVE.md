# Free Render Cold-Start Elimination Guide (₹0 Cost)

Render's free web service tier puts web instances to sleep after 15 minutes of inactivity, causing cold start delays of 30-60 seconds on the next user request.

Follow this quick step-by-step setup guide to keep your backend warm 24/7 at **₹0 cost**.

---

## Dedicated Endpoint
We added an ultra-fast, 0-database overhead ping route to your backend:
```
GET https://<your-render-app-name>.onrender.com/api/ping
```
It returns `200 OK` (`pong`) in <5ms.

---

## Option 1: UptimeRobot (Recommended, 2 Minutes)
1. Go to [UptimeRobot.com](https://uptimerobot.com) and create a free account.
2. Click **+ Add New Monitor**.
3. Set the following settings:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Mansara Backend Keepalive`
   - **URL (or IP)**: `https://<your-render-app-name>.onrender.com/api/ping` (Replace with your actual Render API URL, e.g. `https://mansara-backend.onrender.com/api/ping`)
   - **Monitoring Interval**: Every `5 minutes` or `10 minutes`
4. Click **Create Monitor**.

---

## Option 2: Cron-Job.org (Free Alternative)
1. Go to [cron-job.org](https://cron-job.org) and register for a free account.
2. Click **Create Cronjob**.
3. Set the details:
   - **Title**: `Mansara Backend Ping`
   - **Address (URL)**: `https://<your-render-app-name>.onrender.com/api/ping`
   - **Execution Schedule**: Every `10 minutes`
4. Click **Save**.

---

## Option 3: Automatic Self-Ping
In `server.js`, set the environment variable on Render dashboard:
```env
RENDER_EXTERNAL_URL=https://<your-render-app-name>.onrender.com
```
When configured, the Node backend will self-ping its own `/api/ping` route every 10 minutes to remain active whenever server traffic occurs.
