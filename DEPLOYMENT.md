# SwipeVault Deployment Guide

This guide explains how to deploy SwipeVault using **Elestio** for infrastructure services and **Railway** for the application.

## Architecture Overview

- **Application**: Next.js + Express (hosted on Railway)
- **Database**: PostgreSQL/MySQL (hosted on Elestio)
- **Redis**: Job queue and caching (hosted on Elestio)
- **Qdrant**: Vector database for semantic search (hosted on Elestio)
- **Gmail API**: Google Cloud Platform
- **AI**: Built-in Manus OpenAI API (no additional setup needed)

## Step 1: Set Up Elestio Services

### 1.1 Create PostgreSQL/MySQL Database

1. Go to [Elestio](https://elest.io/) and create a new service
2. Select **MySQL** or **PostgreSQL**
3. Choose your region and plan
4. After deployment, copy the connection string
5. Format: `mysql://user:password@host:port/database`

### 1.2 Create Redis Instance

1. Create a new **Redis** service on Elestio
2. Copy the connection details:
   - Host
   - Port (usually 6379)
   - Password
   - TLS enabled (yes/no)

### 1.3 Create Qdrant Vector Database

1. Create a new **Qdrant** service on Elestio
2. Copy the connection details:
   - URL (e.g., `https://your-qdrant.elestio.app`)
   - API Key

## Step 2: Set Up Google Cloud Platform

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Gmail API**
4. Enable **Cloud Pub/Sub API**

### 2.2 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Add authorized redirect URI: `https://your-app-url.com/api/mailboxes/oauth/callback`
5. Copy **Client ID** and **Client Secret**

### 2.3 Set Up Pub/Sub for Gmail Notifications

1. Go to **Pub/Sub** > **Topics**
2. Create topic: `gmail-notifications`
3. Create subscription: `gmail-sub`
4. Grant Gmail permission to publish:
   - Add principal: `serviceAccount:gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**

## Step 3: Deploy to Railway

### 3.1 Connect Repository

1. Go to [Railway](https://railway.app/)
2. Create new project
3. Connect your GitHub repository (or deploy from local)

### 3.2 Configure Environment Variables

Add these environment variables in Railway dashboard:

**Database (from Elestio)**
```
DATABASE_URL=mysql://user:password@host:port/swipevault
```

**Redis (from Elestio)**
```
REDIS_HOST=your-redis-host.elestio.app
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

**Qdrant (from Elestio)**
```
QDRANT_URL=https://your-qdrant-host.elestio.app
QDRANT_API_KEY=your-qdrant-api-key
```

**Gmail API (from Google Cloud)**
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-railway-app.railway.app/api/mailboxes/oauth/callback
GOOGLE_PUBSUB_PROJECT_ID=your-project-id
GOOGLE_PUBSUB_TOPIC=gmail-notifications
GOOGLE_PUBSUB_SUBSCRIPTION=gmail-sub
```

**Security**
```
ENCRYPTION_KEY=generate-a-random-32-character-key
APP_URL=https://your-railway-app.railway.app
```

### 3.3 Deploy

1. Railway will automatically deploy on push
2. Wait for build to complete
3. Access your app at the Railway-provided URL

## Step 4: Initialize Database

After first deployment:

1. SSH into Railway container or use Railway CLI
2. Run database migrations:
   ```bash
   pnpm db:push
   ```
3. Seed tags:
   ```bash
   npx tsx scripts/seed-tags.ts
   ```

## Step 5: Initialize Qdrant Collection

The Qdrant collection will be automatically created on first use, but you can manually initialize:

```bash
# This happens automatically when the first email is processed
```

## Step 6: Test Gmail Connection

1. Log into your deployed app
2. Go to **Mailboxes** page
3. Click **Connect Gmail**
4. Authorize with your Gmail account
5. Verify mailbox appears as connected

## Cost Estimates

### Elestio (Monthly)
- PostgreSQL: $7-15
- Redis: $7-15
- Qdrant: $7-15
- **Total: ~$21-45/month**

### Railway (Monthly)
- Free tier: $0 (with limits)
- Hobby: $5/month
- Pro: $20/month
- **Recommended: Hobby ($5/month)**

### Google Cloud
- Gmail API: Free (quota: 1 billion requests/day)
- Pub/Sub: Free tier (10 GB/month)

### Total Monthly Cost
**~$26-50/month** for full production deployment

## Monitoring

- **Railway**: Built-in logs and metrics
- **Elestio**: Service health dashboards
- **BullMQ**: Job queue monitoring via Redis

## Troubleshooting

### Gmail Watch Expires
- Watches expire after 7 days
- Implement cron job to renew watches
- Check `watch_expires_at` in database

### Redis Connection Errors
- Verify TLS settings
- Check firewall rules
- Confirm password is correct

### Qdrant Connection Issues
- Verify API key
- Check URL format (include https://)
- Ensure collection is created

## Security Checklist

- [ ] OAuth tokens are encrypted at rest
- [ ] HTTPS enabled on Railway
- [ ] Redis password protected
- [ ] Qdrant API key secured
- [ ] Gmail API credentials secured
- [ ] Environment variables not committed to git
- [ ] CORS properly configured
- [ ] Rate limiting enabled

## Next Steps

1. Set up monitoring and alerts
2. Configure backup strategy for PostgreSQL
3. Implement cron job for Gmail watch renewal
4. Add error tracking (Sentry)
5. Set up CI/CD pipeline

