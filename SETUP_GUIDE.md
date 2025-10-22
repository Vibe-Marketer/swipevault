# SwipeVault Setup Guide

This guide walks you through setting up SwipeVault from scratch, including all external services needed for production deployment.

## Overview

SwipeVault requires the following services:

1. **Database**: PostgreSQL or MySQL (hosted on Elestio)
2. **Redis**: For job queue and caching (hosted on Elestio)
3. **Qdrant**: Vector database for semantic search (hosted on Elestio)
4. **Gmail API**: For email access (Google Cloud Platform)
5. **Google Pub/Sub**: For real-time notifications (Google Cloud Platform)
6. **Application Hosting**: Railway or similar platform

## Part 1: Set Up Elestio Infrastructure

### Step 1: Create Elestio Account

1. Go to [https://elest.io/](https://elest.io/)
2. Sign up for an account
3. Add payment method (required for service provisioning)

### Step 2: Deploy PostgreSQL Database

1. Click **Create Service**
2. Select **PostgreSQL** (or MySQL if you prefer)
3. Choose configuration:
   - **Region**: Select closest to your users
   - **Plan**: Start with **Tiny** ($7/month) or **Small** ($15/month)
   - **Version**: Latest stable version
4. Click **Deploy**
5. Wait for deployment to complete (2-5 minutes)
6. Once deployed, click on the service to view details
7. Copy the **Connection String** (looks like: `postgresql://user:password@host:port/database`)
8. **Save this for later** - you'll need it for Railway

### Step 3: Deploy Redis

1. Click **Create Service**
2. Select **Redis**
3. Choose configuration:
   - **Region**: Same as PostgreSQL
   - **Plan**: **Tiny** ($7/month)
   - **Version**: Latest stable version
4. Click **Deploy**
5. Once deployed, copy these details:
   - **Host**: (e.g., `redis-12345.elestio.app`)
   - **Port**: Usually `6379`
   - **Password**: Found in service details
   - **TLS**: Usually enabled (check service details)
6. **Save these for later**

### Step 4: Deploy Qdrant Vector Database

1. Click **Create Service**
2. Select **Qdrant**
3. Choose configuration:
   - **Region**: Same as PostgreSQL
   - **Plan**: **Tiny** ($7/month)
   - **Version**: Latest stable version
4. Click **Deploy**
5. Once deployed, copy these details:
   - **URL**: (e.g., `https://qdrant-12345.elestio.app`)
   - **API Key**: Found in service details
6. **Save these for later**

**Elestio Total Cost**: ~$21-45/month depending on plan sizes

---

## Part 2: Set Up Google Cloud Platform

### Step 1: Create Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `swipevault`
4. Click **Create**
5. Wait for project creation, then select it

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Gmail API**
   - **Cloud Pub/Sub API**
3. Click **Enable** for each

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Configure Consent Screen**
   - User Type: **External**
   - Click **Create**
3. Fill in OAuth consent screen:
   - **App name**: SwipeVault
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click **Save and Continue**
4. Scopes: Click **Add or Remove Scopes**
   - Add: `https://www.googleapis.com/auth/gmail.readonly`
   - Add: `https://www.googleapis.com/auth/gmail.metadata`
   - Click **Update** → **Save and Continue**
5. Test users: Add your Gmail address
   - Click **Save and Continue**
6. Click **Back to Dashboard**

7. Now create credentials:
   - Go to **Credentials** tab
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `SwipeVault Web Client`
   - Authorized redirect URIs: 
     - For development: `http://localhost:3000/api/mailboxes/oauth/callback`
     - For production: `https://your-railway-app.railway.app/api/mailboxes/oauth/callback` (you'll update this later)
   - Click **Create**
8. Copy **Client ID** and **Client Secret**
9. **Save these for later**

### Step 4: Set Up Cloud Pub/Sub

1. Go to **Pub/Sub** → **Topics**
2. Click **Create Topic**
   - Topic ID: `gmail-notifications`
   - Leave other settings as default
   - Click **Create**
3. Click on the topic you just created
4. Go to **Permissions** tab
5. Click **Add Principal**
   - New principal: `serviceAccount:gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**
   - Click **Save**
6. Go back to **Subscriptions** tab
7. Click **Create Subscription**
   - Subscription ID: `gmail-sub`
   - Select topic: `gmail-notifications`
   - Delivery type: **Pull**
   - Click **Create**
8. Copy your **Project ID** (found at top of console)
9. **Save this for later**

---

## Part 3: Deploy to Railway

### Step 1: Prepare Your Code

1. Make sure all code is committed to a Git repository (GitHub, GitLab, etc.)
2. Or prepare to deploy from local directory

### Step 2: Create Railway Account

1. Go to [https://railway.app/](https://railway.app/)
2. Sign up with GitHub (recommended)
3. Verify your email

### Step 3: Create New Project

1. Click **New Project**
2. Choose **Deploy from GitHub repo** (or **Deploy from local**)
3. Select your SwipeVault repository
4. Railway will automatically detect it's a Node.js app

### Step 4: Configure Environment Variables

1. Click on your deployed service
2. Go to **Variables** tab
3. Click **Add Variable** and add ALL of these:

**Database (from Elestio PostgreSQL)**
```
DATABASE_URL=postgresql://user:password@host:port/swipevault
```

**Redis (from Elestio Redis)**
```
REDIS_HOST=redis-12345.elestio.app
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

**Qdrant (from Elestio Qdrant)**
```
QDRANT_URL=https://qdrant-12345.elestio.app
QDRANT_API_KEY=your-qdrant-api-key
```

**Gmail API (from Google Cloud)**
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PUBSUB_PROJECT_ID=swipevault
GOOGLE_PUBSUB_TOPIC=gmail-notifications
GOOGLE_PUBSUB_SUBSCRIPTION=gmail-sub
```

**Security**
```
ENCRYPTION_KEY=generate-a-random-32-character-string-here
NODE_ENV=production
```

**App URL** (you'll get this after first deployment)
```
APP_URL=https://your-app.railway.app
GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/mailboxes/oauth/callback
```

4. Click **Deploy** to trigger deployment

### Step 5: Get Your App URL

1. After deployment completes, Railway will assign a URL
2. Click **Settings** → **Domains**
3. Copy the Railway-provided domain (e.g., `your-app.railway.app`)
4. Go back to **Variables** and update:
   - `APP_URL=https://your-app.railway.app`
   - `GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/mailboxes/oauth/callback`

### Step 6: Update Google OAuth Redirect URI

1. Go back to Google Cloud Console
2. Go to **APIs & Services** → **Credentials**
3. Click on your OAuth client ID
4. Under **Authorized redirect URIs**, add:
   - `https://your-app.railway.app/api/mailboxes/oauth/callback`
5. Click **Save**

### Step 7: Initialize Database

1. In Railway, click on your service
2. Click **Settings** → **Deploy Logs** to see if there are any errors
3. You need to run migrations. Two options:

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run pnpm db:push

# Seed tags
railway run npx tsx scripts/seed-tags.ts
```

**Option B: Using Railway Shell**
1. In Railway dashboard, click **Settings** → **Deploy**
2. Enable **Shell Access**
3. Click **Open Shell**
4. Run:
```bash
pnpm db:push
npx tsx scripts/seed-tags.ts
```

---

## Part 4: Test Your Deployment

### Step 1: Access Your App

1. Open your Railway app URL in a browser
2. You should see the SwipeVault login page
3. Log in with your Manus account (or create one)

### Step 2: Connect Gmail

1. Click **Mailboxes** in the sidebar
2. Click **Connect Gmail**
3. You'll be redirected to Google OAuth
4. Grant permissions
5. You should be redirected back to SwipeVault
6. Your Gmail account should now appear in the Mailboxes list

### Step 3: Verify Email Monitoring

1. Send a test email to the connected Gmail account
2. Wait 1-2 minutes for processing
3. Check the **Swipes** page - your email should appear
4. Click on the email to see AI classification and insights

---

## Troubleshooting

### Database Connection Errors

**Error**: `Cannot connect to database`

**Solution**:
- Verify `DATABASE_URL` is correct
- Check Elestio PostgreSQL service is running
- Ensure IP allowlist in Elestio allows Railway IPs (usually auto-configured)

### Redis Connection Errors

**Error**: `ECONNREFUSED 6379`

**Solution**:
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` are correct
- Check `REDIS_TLS=true` if Elestio Redis has TLS enabled
- Ensure Redis service is running in Elestio

### Gmail OAuth Errors

**Error**: `redirect_uri_mismatch`

**Solution**:
- Verify `GOOGLE_REDIRECT_URI` matches exactly what's in Google Cloud Console
- Ensure you added the Railway URL to authorized redirect URIs
- Check for trailing slashes (should NOT have trailing slash)

### Pub/Sub Errors

**Error**: `Permission denied on topic`

**Solution**:
- Verify you granted `gmail-api-push@system.gserviceaccount.com` publisher permissions
- Check topic name is exactly `gmail-notifications`
- Ensure Pub/Sub API is enabled

### AI Classification Not Working

**Error**: Emails appear but no AI tags

**Solution**:
- Check Railway logs for OpenAI API errors
- Verify Manus built-in API is accessible
- Check job queue is processing (Redis must be working)

---

## Cost Summary

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| PostgreSQL | Elestio | $7-15 |
| Redis | Elestio | $7-15 |
| Qdrant | Elestio | $7-15 |
| Application | Railway | $5 (Hobby) |
| Gmail API | Google | Free |
| Pub/Sub | Google | Free (10GB/month) |
| **Total** | | **$26-50/month** |

---

## Next Steps

1. **Customize branding**: Update app title and logo in Railway environment variables
2. **Set up monitoring**: Add error tracking (Sentry, LogRocket)
3. **Configure backups**: Set up automated backups for PostgreSQL in Elestio
4. **Scale**: Upgrade Elestio plans as your usage grows
5. **Add team members**: Invite collaborators to your Railway project

---

## Support

- **Documentation**: See `README.md` and `DEPLOYMENT.md`
- **Issues**: Open an issue on GitHub
- **Elestio Support**: [https://elest.io/support](https://elest.io/support)
- **Railway Support**: [https://railway.app/help](https://railway.app/help)

